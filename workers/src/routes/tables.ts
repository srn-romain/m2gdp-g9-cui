import { Hono } from 'hono';
import type { Env } from '../env';
import { apiError } from '../errors';
import { parsePagination, pageOf } from '../pagination';
import { requireAuth } from '../auth';
import { guestConfirmedCount, isPassed, newId, nowIso, toTableJson, type TableRow } from '../models';

export const tablesRoutes = new Hono<{ Bindings: Env }>();

const DIETS = ['VEGETARIAN', 'VEGAN', 'NO_PORK', 'NO_GLUTEN', 'NO_LACTOSE', 'HALAL', 'KOSHER', 'NO_NUTS'];

function havKm(a: number, b: number, c2: number, d: number) {
  const R = 6371, t = Math.PI / 180;
  const h = Math.sin(((c2 - a) * t) / 2) ** 2 + Math.cos(a * t) * Math.cos(c2 * t) * Math.sin(((d - b) * t) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

tablesRoutes.get('/', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const url = new URL(c.req.url);
  const latS = url.searchParams.get('lat'), lngS = url.searchParams.get('lng');
  if ((latS == null) !== (lngS == null)) return apiError('VALIDATION_ERROR', 'lat et lng sont obligatoires ensemble.');
  const lat = latS == null ? null : Number(latS);
  const lng = lngS == null ? null : Number(lngS);
  if (lat != null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) return apiError('VALIDATION_ERROR', 'lat invalide.');
  if (lng != null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) return apiError('VALIDATION_ERROR', 'lng invalide.');
  const radiusKm = Number(url.searchParams.get('radiusKm') ?? 5);
  if (!Number.isFinite(radiusKm) || radiusKm < 0.5 || radiusKm > 50) return apiError('VALIDATION_ERROR', 'radiusKm hors limites.', { field: 'radiusKm' });
  const q = url.searchParams.get('query');
  if (q != null && (q.length < 2 || q.length > 80)) return apiError('VALIDATION_ERROR', 'query invalide.', { field: 'query' });
  const sortBy = url.searchParams.get('sortBy') ?? 'distance';
  if (!['distance', 'startsAt', 'seatsAvailable'].includes(sortBy)) return apiError('VALIDATION_ERROR', 'sortBy invalide.');
  if (sortBy === 'distance' && lat == null) return apiError('VALIDATION_ERROR', 'sortBy=distance exige lat+lng.');
  const vegetarianOnly = url.searchParams.get('vegetarianOnly') === 'true';
  // Paramètre `dietary` de l'OpenAPI (répétable). Seul le végétarien est stocké
  // par tablée (colonne isVegetarian) : c'est le seul régime filtrable aujourd'hui.
  const dietary = url.searchParams.getAll('dietary');
  if (dietary.some((d) => !DIETS.includes(d))) return apiError('VALIDATION_ERROR', 'dietary invalide.', { field: 'dietary' });
  const veutVegetarien = vegetarianOnly || dietary.includes('VEGETARIAN');
  const startsAfter = url.searchParams.get('startsAfter');
  const startsBefore = url.searchParams.get('startsBefore');
  const { page, pageSize } = parsePagination(url);
  const rows = await c.env.DB.prepare('SELECT * FROM tables WHERE status IN (\'OPEN\',\'FULL\') LIMIT 500').all<TableRow>();
  let items: Array<Record<string, unknown> & { _d?: number | null }> = [];
  for (const t of rows.results ?? []) {
    if (isPassed(t.startsAt, t.durationMinutes)) continue;
    if (veutVegetarien && !t.isVegetarian) continue;
    if (startsAfter && t.startsAt < startsAfter) continue;
    if (startsBefore && t.startsAt >= startsBefore) continue;
    if (q && !(t.dishName.toLowerCase().includes(q.toLowerCase()) || t.neighborhood.toLowerCase().includes(q.toLowerCase()))) continue;
    const j = await toTableJson(c.env.DB, t, auth.userId) as Record<string, unknown>;
    const d = lat != null ? havKm(lat, lng as number, t.latitude, t.longitude) : null;
    if (d != null && d > radiusKm) continue;
    items.push({ ...j, _d: d });
  }
  if (sortBy === 'startsAt') items.sort((a, b) => String(a['startsAt']).localeCompare(String(b['startsAt'])));
  else if (sortBy === 'seatsAvailable') items.sort((a, b) => Number(b['seatsAvailable']) - Number(a['seatsAvailable']));
  else items.sort((a, b) => (a._d ?? 0) - (b._d ?? 0));
  // Distance en mètres, nulle quand la recherche n'a pas fourni de point.
  items = items.map(({ _d, ...r }) => ({ ...r, distanceMeters: _d == null ? null : Math.round(_d * 1000) }));
  return c.json(pageOf(items.slice((page - 1) * pageSize, page * pageSize), items.length, page, pageSize));
});

tablesRoutes.post('/', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const b = await c.req.json().catch(() => null) as Record<string, unknown> | null;
  if (!b) return apiError('VALIDATION_ERROR', 'Corps invalide.');
  const dish = b['dishName'];
  const loc = b['location'] as Record<string, unknown> | undefined;
  const co = loc?.['coordinates'] as { latitude?: unknown; longitude?: unknown } | undefined;
  if (typeof dish !== 'string' || !dish.trim() || dish.length > 120) return apiError('VALIDATION_ERROR', 'dishName invalide.', { field: 'dishName' });
  if (!b['startsAt'] || Number.isNaN(Date.parse(String(b['startsAt'])))) return apiError('VALIDATION_ERROR', 'startsAt invalide.', { field: 'startsAt' });
  if (new Date(String(b['startsAt'])).getTime() <= Date.now()) return apiError('VALIDATION_ERROR', 'startsAt doit etre futur.');
  const seats = Number(b['seatsTotal']);
  if (!Number.isInteger(seats) || seats < 1) return apiError('VALIDATION_ERROR', 'seatsTotal invalide.', { field: 'seatsTotal' });
  if (!loc || typeof loc['neighborhood'] !== 'string' || typeof loc['city'] !== 'string') return apiError('VALIDATION_ERROR', 'location invalide.', { field: 'location' });
  if (typeof co?.latitude !== 'number' || typeof co?.longitude !== 'number') return apiError('VALIDATION_ERROR', 'coordinates invalides.', { field: 'location.coordinates' });
  const vis = (b['visibility'] as string) ?? 'PUBLIC';
  if (!['PUBLIC', 'PRIVATE'].includes(vis)) return apiError('VALIDATION_ERROR', 'visibility invalide.');
  const id = newId(), now = nowIso(), partId = newId();
  // R1 : tablee + participation HOST CONFIRMED dans la meme transaction.
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO tables (id, hostId, dishName, description, startsAt, durationMinutes, seatsTotal, visibility, status, isVegetarian, hasAllergenNotice, neighborhood, city, postalCode, latitude, longitude, addressLine, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, auth.userId, (dish as string).trim(), (b['description'] as string) ?? null, new Date(String(b['startsAt'])).toISOString(),
      Number(b['durationMinutes'] ?? 120), seats, vis, b['isVegetarian'] ? 1 : 0, b['hasAllergenNotice'] ? 1 : 0,
      loc['neighborhood'], loc['city'], (loc['postalCode'] as string) ?? null,
      co.latitude, co.longitude, (loc['addressLine'] as string) ?? null, now),
    c.env.DB.prepare(
      "INSERT INTO participations (id, tableId, userId, role, status, joinedAt) VALUES (?, ?, ?, 'HOST', 'CONFIRMED', ?)",
    ).bind(partId, id, auth.userId, now),
  ]);
  const row = await c.env.DB.prepare('SELECT * FROM tables WHERE id = ?').bind(id).first<TableRow>();
  return c.json(await toTableJson(c.env.DB, row as TableRow, auth.userId), 201);
});

tablesRoutes.get('/:tableId', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const row = await c.env.DB.prepare('SELECT * FROM tables WHERE id = ?').bind(c.req.param('tableId')).first<TableRow>();
  if (!row) return apiError('NOT_FOUND', 'Tablee introuvable.');
  return c.json(await toTableJson(c.env.DB, row, auth.userId));
});
