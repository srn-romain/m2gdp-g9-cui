import { Hono } from 'hono';
import type { Env } from '../env';
import { apiError } from '../errors';
import { parsePagination, pageOf } from '../pagination';
import { requireAuth } from '../auth';
import { queryIn } from '../db';
import { effectiveDietaryTags, isPassed, nowIso, parseWantedContributions, round300m, type TableRow } from '../models';

const DIETS = ['VEGETARIAN','VEGAN','NO_PORK','NO_GLUTEN','NO_LACTOSE','HALAL','KOSHER','NO_NUTS'];

function userJson(r: Record<string, unknown>) {
  return {
    id: r['id'], email: r['email'], firstName: r['firstName'], lastName: r['lastName'],
    neighborhood: r['neighborhood'], city: r['city'],
    coordinates: r['lat'] == null ? null : { latitude: r['lat'], longitude: r['lng'] },
    dietaryPreferences: JSON.parse((r['dietaryPreferences'] as string) || '[]'),
    avatarUrl: r['avatarUrl'] ?? null, status: r['status'],
    createdAt: r['createdAt'], updatedAt: r['updatedAt'],
  };
}

export const meRoutes = new Hono<{ Bindings: Env }>();

meRoutes.get('/', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const r = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(auth.userId).first();
  if (!r) return apiError('NOT_FOUND', 'Profil introuvable.');
  return c.json(userJson(r as unknown as Record<string, unknown>));
});

meRoutes.patch('/', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const b = await c.req.json().catch(() => null) as Record<string, unknown> | null;
  if (!b || typeof b !== 'object') return apiError('VALIDATION_ERROR', 'Corps invalide.');
  const sets: string[] = [];
  const vals: unknown[] = [];
  const str = (k: string, max: number) => {
    if (b[k] === undefined) return;
    if (typeof b[k] !== 'string' || (b[k] as string).length > max) throw new Error(k);
    sets.push(`${k} = ?`); vals.push(b[k]);
  };
  try {
    str('firstName', 80); str('lastName', 80); str('neighborhood', 80); str('city', 80);
    if (b['avatarUrl'] !== undefined) {
      if (b['avatarUrl'] !== null && typeof b['avatarUrl'] !== 'string') throw new Error('avatarUrl');
      sets.push('avatarUrl = ?'); vals.push(b['avatarUrl']);
    }
    if (b['coordinates'] !== undefined && b['coordinates'] !== null) {
      const co = b['coordinates'] as { latitude?: unknown; longitude?: unknown };
      if (typeof co.latitude !== 'number' || typeof co.longitude !== 'number') throw new Error('coordinates');
      sets.push('lat = ?'); vals.push(co.latitude);
      sets.push('lng = ?'); vals.push(co.longitude);
    }
    if (b['dietaryPreferences'] !== undefined) {
      if (!Array.isArray(b['dietaryPreferences']) || !(b['dietaryPreferences'] as unknown[]).every((d) => DIETS.includes(d as string))) throw new Error('dietaryPreferences');
      sets.push('dietaryPreferences = ?'); vals.push(JSON.stringify(b['dietaryPreferences']));
    }
  } catch (e) {
    return apiError('VALIDATION_ERROR', 'Champ invalide.', { field: (e as Error).message });
  }
  if (!sets.length) return apiError('VALIDATION_ERROR', 'Rien a mettre a jour.');
  sets.push('updatedAt = ?'); vals.push(nowIso()); vals.push(auth.userId);
  await c.env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  const r = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(auth.userId).first();
  if (!r) return apiError('NOT_FOUND', 'Profil introuvable.');
  return c.json(userJson(r as unknown as Record<string, unknown>));
});

meRoutes.get('/tables', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const url = new URL(c.req.url);
  const scope = url.searchParams.get('scope') ?? 'upcoming';
  if (!['upcoming', 'past', 'all'].includes(scope)) return apiError('VALIDATION_ERROR', 'Scope invalide.', { field: 'scope' });
  const { page, pageSize } = parsePagination(url);
  const rows = await c.env.DB.prepare(
    `SELECT t.* FROM tables t JOIN participations p ON p.tableId = t.id
     WHERE p.userId = ? AND p.status = 'CONFIRMED' ORDER BY t.startsAt ASC LIMIT 500`,
  ).bind(auth.userId).all<TableRow>();
  const candidates = (rows.results ?? []).filter((t) => {
    const past = isPassed(t.startsAt, t.durationMinutes);
    if (scope === 'upcoming' && past) return false;
    if (scope === 'past' && !past) return false;
    return true;
  });

  type GuestCount = { tableId: string; n: number };
  type HostRow = { id: string; firstName: string; avatarUrl: string | null; neighborhood: string; city: string };
  type ViewerPart = { id: string; tableId: string; role: string; status: string; joinedAt: string };
  type ContribRow = { id: string; participationId: string; label: string; quantity: string | null; unit: string | null; category: string; status: string; tableId: string; userId: string; firstName: string; avatarUrl: string | null; neighborhood: string; city: string };

  const ids = candidates.map((t) => t.id);
  const guestCounts = new Map<string, number>();
  const viewerParts = new Map<string, ViewerPart>();
  const hostRows = new Map<string, HostRow>();
  const contribs = new Map<string, ContribRow[]>();

  if (ids.length) {
    const guests = await queryIn<GuestCount>(c.env.DB,
      (ph) => `SELECT tableId, COUNT(*) AS n FROM participations WHERE tableId IN (${ph}) AND role = 'GUEST' AND status = 'CONFIRMED' GROUP BY tableId`,
      ids,
    );
    for (const r of guests) guestCounts.set(r.tableId, r.n);

    const views = await queryIn<ViewerPart>(c.env.DB,
      (ph) => `SELECT id, tableId, role, status, joinedAt FROM participations WHERE tableId IN (${ph}) AND userId = ? AND status = 'CONFIRMED'`,
      ids,
      [auth.userId],
    );
    for (const r of views) viewerParts.set(r.tableId, r);

    const hostIds = [...new Set(candidates.map((t) => t.hostId))];
    const hosts = await queryIn<HostRow>(c.env.DB,
      (ph) => `SELECT id, firstName, avatarUrl, neighborhood, city FROM users WHERE id IN (${ph})`,
      hostIds,
    );
    for (const r of hosts) hostRows.set(r.id, r);

    const contribsRows = await queryIn<ContribRow>(c.env.DB,
      (ph) => `SELECT c.id, c.participationId, c.label, c.quantity, c.unit, c.category, c.status, p.tableId, p.userId, u.firstName, u.avatarUrl, u.neighborhood, u.city FROM contributions c JOIN participations p ON p.id = c.participationId JOIN users u ON u.id = p.userId WHERE p.tableId IN (${ph}) AND p.status = 'CONFIRMED' ORDER BY p.joinedAt ASC`,
      ids,
    );
    for (const r of contribsRows) {
      const arr = contribs.get(r.tableId) ?? [];
      arr.push(r);
      contribs.set(r.tableId, arr);
    }
  }

  const items = candidates.map((t) => {
    const confirmed = guestCounts.get(t.id) ?? 0;
    const seatsAvailable = Math.max(0, t.seatsTotal - confirmed);
    let status = t.status;
    if (status === 'OPEN' && seatsAvailable === 0) status = 'FULL';
    else if (status === 'FULL' && seatsAvailable > 0) status = 'OPEN';
    const viewerPart = viewerParts.get(t.id);
    const exact = !!viewerPart || t.hostId === auth.userId;
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
    const dietaryTags = [...effectiveDietaryTags(t)];
    return {
      id: t.id, hostId: t.hostId, dishName: t.dishName, description: t.description,
      title: host?.firstName ? `${t.dishName} chez ${host.firstName}` : t.dishName,
      startsAt: t.startsAt, durationMinutes: t.durationMinutes, seatsTotal: t.seatsTotal,
      seatsAvailable, visibility: t.visibility, status,
      isVegetarian: dietaryTags.includes('VEGETARIAN'),
      dietaryTags,
      hasAllergenNotice: !!t.hasAllergenNotice,
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
    };
  });
  const total = items.length;
  return c.json(pageOf(items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize));
});
