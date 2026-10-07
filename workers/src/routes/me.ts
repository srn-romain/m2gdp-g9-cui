import { Hono } from 'hono';
import type { Env } from '../env';
import { apiError } from '../errors';
import { parsePagination, pageOf } from '../pagination';
import { requireAuth } from '../auth';
import { nowIso, toTableJson, type TableRow } from '../models';

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
  const now = new Date();
  const items: unknown[] = [];
  for (const t of rows.results ?? []) {
    const j = await toTableJson(c.env.DB, t, auth.userId);
    const past = (j as { status: string }).status === 'PASSED' || (j as { startsAt: string }).startsAt <= now.toISOString();
    if (scope === 'upcoming' && past) continue;
    if (scope === 'past' && !past) continue;
    items.push(j);
  }
  const total = items.length;
  return c.json(pageOf(items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize));
});
