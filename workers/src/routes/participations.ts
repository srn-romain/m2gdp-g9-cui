import { Hono } from 'hono';
import type { Env } from '../env';
import { apiError } from '../errors';
import { requireAuth } from '../auth';
import { guestConfirmedCount, isPassed, newId, nowIso, toTableJson, type TableRow } from '../models';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATS = ['APPETIZER','MAIN','DESSERT','DRINK','INGREDIENT','NONE'];
const UNITS = ['KG','G','L','CL','UNIT','PORTION'];

interface ApportInput {
  label: string;
  category: string;
  quantity: number | null;
  unit: string | null;
}

/** Valide une liste d'apports (0..N). Renvoie null si une entrée est invalide. */
function normaliserApports(input: unknown): ApportInput[] | null {
  if (input == null) return [];
  if (!Array.isArray(input) || input.length > 20) return null;
  const items: ApportInput[] = [];
  for (const brut of input) {
    const o = (brut ?? {}) as Record<string, unknown>;
    const label = typeof o['label'] === 'string' ? o['label'].trim() : '';
    if (!label || label.length > 120) return null;
    const category = String(o['category'] ?? 'INGREDIENT');
    if (!CATS.includes(category)) return null;
    if (category === 'NONE' && (o['quantity'] != null || o['unit'] != null)) return null;
    if (o['unit'] != null && !UNITS.includes(String(o['unit']))) return null;
    const quantity = o['quantity'] == null ? null : Number(o['quantity']);
    if (quantity != null && (!Number.isFinite(quantity) || quantity <= 0)) return null;
    items.push({ label: label, category, quantity, unit: (o['unit'] as string) ?? null });
  }
  return items;
}

export const participationsRoutes = new Hono<{ Bindings: Env }>();

participationsRoutes.post('/tables/:tableId/participations', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const tableId = c.req.param('tableId');
  const idem = c.req.header('Idempotency-Key');
  if (idem !== undefined && !UUID_RE.test(idem)) return apiError('VALIDATION_ERROR', 'Idempotency-Key invalide.');
  // Rejouer = renvoyer l'existant.
  if (idem) {
    const k = await c.env.DB.prepare('SELECT participationId FROM idempotency_keys WHERE key = ? AND userId = ? AND tableId = ?')
      .bind(idem, auth.userId, tableId).first<{ participationId: string }>();
    if (k) {
      const p = await c.env.DB.prepare('SELECT * FROM participations WHERE id = ?').bind(k.participationId).first();
      return c.json(p, 201);
    }
  }
  const t = await c.env.DB.prepare('SELECT * FROM tables WHERE id = ?').bind(tableId)
    .first<{ id: string; status: string; startsAt: string; durationMinutes: number; seatsTotal: number }>();
  if (!t) return apiError('NOT_FOUND', 'Tablee introuvable.');
  const existing = await c.env.DB.prepare('SELECT id, role, status FROM participations WHERE tableId = ? AND userId = ?')
    .bind(tableId, auth.userId).first<{ id: string; role: string; status: string }>();
  if (existing?.status === 'CONFIRMED') return apiError('ALREADY_PARTICIPATING', 'Vous participez deja a cette tablee.');
  if (t.status === 'CANCELLED') return apiError('TABLE_CLOSED', 'Tablee annulee.');
  if (t.status === 'PASSED' || isPassed(t.startsAt, t.durationMinutes)) return apiError('TABLE_PASSED', 'Tablee passee.');
  const seats = t.seatsTotal - await guestConfirmedCount(c.env.DB, tableId);
  if (t.status !== 'OPEN' || seats < 1) return apiError('TABLE_FULL', 'Cette tablee est complete.');
  const b = await c.req.json().catch(() => null) as { contributions?: unknown } | null;
  const apports = normaliserApports(b?.contributions);
  if (!apports) return apiError('VALIDATION_ERROR', 'contributions invalide.', { field: 'contributions' });
  const now = nowIso();
  const pid = existing ? existing.id : newId();
  const stmts: D1PreparedStatement[] = [];
  if (existing) {
    // Retour 6 : réactive une participation annulée au lieu de bloquer (UNIQUE tableId+userId).
    stmts.push(
      c.env.DB.prepare("UPDATE participations SET status = 'CONFIRMED', joinedAt = ? WHERE id = ?").bind(now, pid),
      c.env.DB.prepare('DELETE FROM contributions WHERE participationId = ?').bind(pid),
    );
  } else {
    stmts.push(
      c.env.DB.prepare("INSERT INTO participations (id, tableId, userId, role, status, joinedAt) VALUES (?, ?, ?, 'GUEST', 'CONFIRMED', ?)").bind(pid, tableId, auth.userId, now),
    );
  }
  for (const a of apports) {
    stmts.push(
      c.env.DB.prepare("INSERT INTO contributions (id, participationId, label, quantity, unit, category, status) VALUES (?, ?, ?, ?, ?, ?, 'PROPOSED')")
        .bind(newId(), pid, a.label, a.quantity != null ? String(a.quantity) : null, a.unit, a.category),
    );
  }
  if (idem) stmts.push(c.env.DB.prepare('INSERT INTO idempotency_keys (key, userId, tableId, participationId, createdAt) VALUES (?, ?, ?, ?, ?)').bind(idem, auth.userId, tableId, pid, now));
  await c.env.DB.batch(stmts);
  const p = await c.env.DB.prepare('SELECT * FROM participations WHERE id = ?').bind(pid).first();
  return c.json({ ...(p as object), contributions: apports.map((a) => ({ ...a, status: 'PROPOSED' })) }, existing ? 200 : 201);
});

participationsRoutes.delete('/tables/:tableId/participations/me', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const tableId = c.req.param('tableId');
  const p = await c.env.DB.prepare('SELECT * FROM participations WHERE tableId = ? AND userId = ?')
    .bind(tableId, auth.userId).first<{ id: string; role: string }>();
  if (!p) return apiError('NOT_FOUND', 'Participation introuvable.');
  if (p.role === 'HOST') return apiError('HOST_CANNOT_LEAVE', "L'hote ne quitte pas, il annule.");
  const tb = await c.env.DB.prepare('SELECT status, startsAt, durationMinutes FROM tables WHERE id = ?').bind(tableId)
    .first<{ status: string; startsAt: string; durationMinutes: number }>();
  if (tb && (tb.status === 'PASSED' || isPassed(tb.startsAt, tb.durationMinutes))) {
    return apiError('TABLE_PASSED', 'Tablee passee.');
  }
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE participations SET status = 'CANCELLED' WHERE id = ?").bind(p.id),
    c.env.DB.prepare('DELETE FROM contributions WHERE participationId = ?').bind(p.id),
  ]);
  return c.body(null, 204);
});

participationsRoutes.patch('/tables/:tableId/contributions/me', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const tableId = c.req.param('tableId');
  const p = await c.env.DB.prepare(
    "SELECT id FROM participations WHERE tableId = ? AND userId = ? AND status = 'CONFIRMED'",
  ).bind(tableId, auth.userId).first<{ id: string }>();
  if (!p) return apiError('FORBIDDEN', 'Seuls les participants confirmes apportent quelque chose.');
  const tb = await c.env.DB.prepare('SELECT status, startsAt, durationMinutes FROM tables WHERE id = ?').bind(tableId)
    .first<{ status: string; startsAt: string; durationMinutes: number }>();
  if (!tb) return apiError('NOT_FOUND', 'Tablee introuvable.');
  if (tb.status === 'PASSED' || isPassed(tb.startsAt, tb.durationMinutes)) {
    return apiError('TABLE_PASSED', 'Tablee passee.');
  }
  const b = await c.req.json().catch(() => null) as { contributions?: unknown } | null;
  const apports = normaliserApports(b?.contributions);
  if (!apports) return apiError('VALIDATION_ERROR', 'contributions invalide.', { field: 'contributions' });
  await c.env.DB.prepare('DELETE FROM contributions WHERE participationId = ?').bind(p.id).run();
  for (const a of apports) {
    await c.env.DB.prepare(
      'INSERT INTO contributions (id, participationId, label, quantity, unit, category, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(newId(), p.id, a.label, a.quantity != null ? String(a.quantity) : null, a.unit, a.category, 'PROPOSED').run();
  }
  const row = await c.env.DB.prepare('SELECT * FROM tables WHERE id = ?').bind(tableId).first<TableRow>();
  return c.json(await toTableJson(c.env.DB, row as TableRow, auth.userId));
});
