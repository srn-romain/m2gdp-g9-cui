import { Hono } from 'hono';
import type { Env } from '../env';
import { apiError } from '../errors';
import { parsePagination, pageOf } from '../pagination';
import { requireAuth } from '../auth';
import { isPassed, newId, nowIso, parseWantedContributions, round300m, toTableJson, type TableRow } from '../models';

export const tablesRoutes = new Hono<{ Bindings: Env }>();

const DIETS = ['VEGETARIAN', 'VEGAN', 'NO_PORK', 'NO_GLUTEN', 'NO_LACTOSE', 'HALAL', 'KOSHER', 'NO_NUTS'];
const UNITES = ['KG', 'G', 'L', 'CL', 'UNIT', 'PORTION'];

/** Ingrédients proposés par l'hôte : liste de courses, bornée et normalisée. */
function parseWanted(input: unknown): Array<{ label: string; quantity: number | null; unit: string | null }> | null {
  if (input == null) return [];
  if (!Array.isArray(input) || input.length > 20) return null;
  const items: Array<{ label: string; quantity: number | null; unit: string | null }> = [];
  for (const brut of input) {
    const o = brut as Record<string, unknown>;
    const label = typeof o?.['label'] === 'string' ? o['label'].trim() : '';
    if (!label || label.length > 120) return null;
    const quantity = o?.['quantity'] == null ? null : Number(o['quantity']);
    if (quantity != null && (!Number.isFinite(quantity) || quantity <= 0)) return null;
    const unit = o?.['unit'] == null ? null : String(o['unit']);
    if (unit != null && !UNITES.includes(unit)) return null;
    items.push({ label, quantity, unit });
  }
  return items;
}

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
  const candidates: TableRow[] = [];
  for (const t of rows.results ?? []) {
    if (isPassed(t.startsAt, t.durationMinutes)) continue;
    if (veutVegetarien && !t.isVegetarian) continue;
    if (startsAfter && t.startsAt < startsAfter) continue;
    if (startsBefore && t.startsAt >= startsBefore) continue;
    if (q && !(t.dishName.toLowerCase().includes(q.toLowerCase()) || t.neighborhood.toLowerCase().includes(q.toLowerCase()))) continue;
    candidates.push(t);
  }

  type GuestCount = { tableId: string; n: number };
  type HostRow = { id: string; firstName: string; avatarUrl: string | null; neighborhood: string; city: string };
  type ViewerPart = { id: string; tableId: string; role: string; status: string; joinedAt: string };
  type ContribRow = { id: string; participationId: string; label: string; quantity: string | null; unit: string | null; category: string; status: string; tableId: string; userId: string; firstName: string; avatarUrl: string | null; neighborhood: string; city: string };

  const ids = candidates.map((t) => t.id);
  const inList = (arr: string[]) => arr.map(() => '?').join(',');
  const guestCounts = new Map<string, number>();
  const viewerParts = new Map<string, ViewerPart>();
  const hostRows = new Map<string, HostRow>();
  const contribs = new Map<string, ContribRow[]>();

  if (ids.length) {
    const ph = inList(ids);
    const g = await c.env.DB.prepare(`SELECT tableId, COUNT(*) AS n FROM participations WHERE tableId IN (${ph}) AND role = 'GUEST' AND status = 'CONFIRMED' GROUP BY tableId`).bind(...ids).all<GuestCount>();
    for (const r of g.results ?? []) guestCounts.set(r.tableId, r.n);

    const v = await c.env.DB.prepare(`SELECT id, tableId, role, status, joinedAt FROM participations WHERE tableId IN (${ph}) AND userId = ? AND status = 'CONFIRMED'`).bind(...ids, auth.userId).all<ViewerPart>();
    for (const r of v.results ?? []) viewerParts.set(r.tableId, r);

    const hostIds = [...new Set(candidates.map((t) => t.hostId))];
    const hp = inList(hostIds);
    const h = await c.env.DB.prepare(`SELECT id, firstName, avatarUrl, neighborhood, city FROM users WHERE id IN (${hp})`).bind(...hostIds).all<HostRow>();
    for (const r of h.results ?? []) hostRows.set(r.id, r);

    const co = await c.env.DB.prepare(`SELECT c.id, c.participationId, c.label, c.quantity, c.unit, c.category, c.status, p.tableId, p.userId, u.firstName, u.avatarUrl, u.neighborhood, u.city FROM contributions c JOIN participations p ON p.id = c.participationId JOIN users u ON u.id = p.userId WHERE p.tableId IN (${ph}) AND p.status = 'CONFIRMED' ORDER BY p.joinedAt ASC`).bind(...ids).all<ContribRow>();
    for (const r of co.results ?? []) {
      const arr = contribs.get(r.tableId) ?? [];
      arr.push(r);
      contribs.set(r.tableId, arr);
    }
  }

  let items: Array<Record<string, unknown> & { _d?: number | null }> = [];
  for (const t of candidates) {
    const confirmed = guestCounts.get(t.id) ?? 0;
    const seatsAvailable = Math.max(0, t.seatsTotal - confirmed);
    let status = t.status;
    if (status === 'OPEN' && seatsAvailable === 0) status = 'FULL';
    else if (status === 'FULL' && seatsAvailable > 0) status = 'OPEN';
    const viewerPart = viewerParts.get(t.id);
    const isParticipant = !!viewerPart || t.hostId === auth.userId;
    const exact = isParticipant;
    const d = lat != null ? havKm(lat, lng as number, t.latitude, t.longitude) : null;
    if (d != null && d > radiusKm) continue;
    const hostRow = hostRows.get(t.hostId);
    const host = hostRow ? { id: hostRow.id, firstName: hostRow.firstName, avatarUrl: hostRow.avatarUrl ?? null, neighborhood: hostRow.neighborhood, city: hostRow.city } : null;
    const tableContribs = contribs.get(t.id) ?? [];
    const contributions = tableContribs.map((cr) => ({
      id: cr.id, label: cr.label,
      quantity: cr.quantity == null ? null : Number(cr.quantity),
      unit: cr.unit, category: cr.category, status: cr.status,
      participant: { id: cr.userId, firstName: cr.firstName, avatarUrl: cr.avatarUrl ?? null, neighborhood: cr.neighborhood, city: cr.city },
    }));
    let myParticipation = null;
    if (viewerPart) {
      const own = tableContribs.find((cr) => cr.participationId === viewerPart.id);
      myParticipation = {
        id: viewerPart.id, tableId: t.id, role: viewerPart.role, status: viewerPart.status, joinedAt: viewerPart.joinedAt,
        contribution: own ? { id: own.id, label: own.label, quantity: own.quantity == null ? null : Number(own.quantity), unit: own.unit, category: own.category, status: own.status } : null,
      };
    }
    items.push({
      id: t.id, hostId: t.hostId, dishName: t.dishName, description: t.description,
      title: host?.firstName ? `${t.dishName} chez ${host.firstName}` : t.dishName,
      startsAt: t.startsAt, durationMinutes: t.durationMinutes, seatsTotal: t.seatsTotal,
      seatsAvailable, visibility: t.visibility, status,
      isVegetarian: !!t.isVegetarian, hasAllergenNotice: !!t.hasAllergenNotice,
      host,
      location: {
        neighborhood: t.neighborhood, city: t.city, postalCode: t.postalCode,
        coordinates: { latitude: exact ? t.latitude : round300m(t.latitude), longitude: exact ? t.longitude : round300m(t.longitude) },
        ...(exact && t.addressLine ? { addressLine: t.addressLine } : {}),
      },
      contributions,
      wantedContributions: parseWantedContributions(t.wantedContributions),
      myParticipation,
      distanceMeters: null,
      createdAt: t.createdAt,
      _d: d,
    });
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
  const wanted = parseWanted(b['wantedContributions']);
  if (!wanted) return apiError('VALIDATION_ERROR', 'wantedContributions invalide.', { field: 'wantedContributions' });
  const id = newId(), now = nowIso(), partId = newId();
  // R1 : tablee + participation HOST CONFIRMED dans la meme transaction.
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO tables (id, hostId, dishName, description, startsAt, durationMinutes, seatsTotal, visibility, status, isVegetarian, hasAllergenNotice, neighborhood, city, postalCode, latitude, longitude, addressLine, wantedContributions, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, auth.userId, (dish as string).trim(), (b['description'] as string) ?? null, new Date(String(b['startsAt'])).toISOString(),
      Number(b['durationMinutes'] ?? 120), seats, vis, b['isVegetarian'] ? 1 : 0, b['hasAllergenNotice'] ? 1 : 0,
      loc['neighborhood'], loc['city'], (loc['postalCode'] as string) ?? null,
      co.latitude, co.longitude, (loc['addressLine'] as string) ?? null, JSON.stringify(wanted), now),
    c.env.DB.prepare(
      "INSERT INTO participations (id, tableId, userId, role, status, joinedAt) VALUES (?, ?, ?, 'HOST', 'CONFIRMED', ?)",
    ).bind(partId, id, auth.userId, now),
  ]);
  const row = await c.env.DB.prepare('SELECT * FROM tables WHERE id = ?').bind(id).first<TableRow>();
  return c.json(await toTableJson(c.env.DB, row as TableRow, auth.userId), 201);
});

tablesRoutes.get('/suggestions', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const q = (c.req.query('q') ?? '').trim();
  if (q.length < 2 || q.length > 80) {
    return c.json({ data: { dishes: [], neighborhoods: [], cities: [] } });
  }
  const term = q.toLowerCase();
  const dishes = await c.env.DB.prepare(
    "SELECT DISTINCT dishName AS value FROM tables WHERE status IN ('OPEN','FULL') AND instr(lower(dishName), lower(?)) > 0 ORDER BY dishName LIMIT 8",
  ).bind(term).all<{ value: string }>();
  const neighborhoods = await c.env.DB.prepare(
    "SELECT DISTINCT neighborhood AS value FROM tables WHERE status IN ('OPEN','FULL') AND instr(lower(neighborhood), lower(?)) > 0 ORDER BY neighborhood LIMIT 8",
  ).bind(term).all<{ value: string }>();
  const cities = await c.env.DB.prepare(
    "SELECT DISTINCT city AS value FROM tables WHERE status IN ('OPEN','FULL') AND instr(lower(city), lower(?)) > 0 ORDER BY city LIMIT 8",
  ).bind(term).all<{ value: string }>();
  return c.json({
    data: {
      dishes: (dishes.results ?? []).map((r) => r.value),
      neighborhoods: (neighborhoods.results ?? []).map((r) => r.value),
      cities: (cities.results ?? []).map((r) => r.value),
    },
  });
});

tablesRoutes.get('/:tableId', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const row = await c.env.DB.prepare('SELECT * FROM tables WHERE id = ?').bind(c.req.param('tableId')).first<TableRow>();
  if (!row) return apiError('NOT_FOUND', 'Tablee introuvable.');
  return c.json(await toTableJson(c.env.DB, row, auth.userId));
});
