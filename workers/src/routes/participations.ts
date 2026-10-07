import { Hono } from 'hono';
import type { Env } from '../env';
import { apiError } from '../errors';
import { requireAuth } from '../auth';
import { guestConfirmedCount, isPassed, newId, nowIso } from '../models';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATS = ['APPETIZER','MAIN','DESSERT','DRINK','INGREDIENT','NONE'];
const UNITS = ['KG','G','L','CL','UNIT','PORTION'];

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
  const dupe = await c.env.DB.prepare('SELECT id FROM participations WHERE tableId = ? AND userId = ?')
    .bind(tableId, auth.userId).first();
  if (dupe) return apiError('ALREADY_PARTICIPATING', 'Vous participez deja a cette tablee.');
  if (t.status === 'CANCELLED') return apiError('TABLE_CLOSED', 'Tablee annulee.');
  if (t.status === 'PASSED' || isPassed(t.startsAt, t.durationMinutes)) return apiError('TABLE_PASSED', 'Tablee passee.');
  if (isPassed(t.startsAt, t.durationMinutes)) return apiError('TABLE_PASSED', 'Tablee passee.');
  const seats = t.seatsTotal - await guestConfirmedCount(c.env.DB, tableId);
  if (t.status !== 'OPEN' || seats < 1) return apiError('TABLE_FULL', 'Cette tablee est complete.');
  const b = await c.req.json().catch(() => null) as { contribution?: Record<string, unknown> } | null;
  const contrib = b?.contribution;
  if (!contrib || typeof contrib['label'] !== 'string' || !contrib['label'].trim()) {
    return apiError('VALIDATION_ERROR', 'Contribution invalide.', { field: 'contribution.label' });
  }
  if (!CATS.includes(String(contrib['category']))) return apiError('VALIDATION_ERROR', 'Categorie invalide.', { field: 'contribution.category' });
  if (contrib['category'] === 'NONE' && (contrib['quantity'] != null || contrib['unit'] != null)) {
    return apiError('VALIDATION_ERROR', 'NONE implique quantity et unit nuls.', { field: 'contribution' });
  }
  if (contrib['unit'] != null && !UNITS.includes(String(contrib['unit']))) {
    return apiError('VALIDATION_ERROR', 'Unite invalide.', { field: 'contribution.unit' });
  }
  const pid = newId(), cid = newId(), now = nowIso();
  const stmts = [
    c.env.DB.prepare("INSERT INTO participations (id, tableId, userId, role, status, joinedAt) VALUES (?, ?, ?, 'GUEST', 'CONFIRMED', ?)").bind(pid, tableId, auth.userId, now),
    c.env.DB.prepare("INSERT INTO contributions (id, participationId, label, quantity, unit, category, status) VALUES (?, ?, ?, ?, ?, ?, 'PROPOSED')")
      .bind(cid, pid, String(contrib['label']).trim(), contrib['quantity'] != null ? String(contrib['quantity']) : null, (contrib['unit'] as string) ?? null, String(contrib['category'])),
  ];
  if (idem) stmts.push(c.env.DB.prepare('INSERT INTO idempotency_keys (key, userId, tableId, participationId, createdAt) VALUES (?, ?, ?, ?, ?)').bind(idem, auth.userId, tableId, pid, now));
  await c.env.DB.batch(stmts);
  const p = await c.env.DB.prepare('SELECT * FROM participations WHERE id = ?').bind(pid).first();
  return c.json({ ...(p as object), contribution: { id: cid, participationId: pid, label: String(contrib['label']).trim(), quantity: contrib['quantity'] ?? null, unit: contrib['unit'] ?? null, category: contrib['category'], status: 'PROPOSED' } }, 201);
});

participationsRoutes.delete('/tables/:tableId/participations/me', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const tableId = c.req.param('tableId');
  const p = await c.env.DB.prepare('SELECT * FROM participations WHERE tableId = ? AND userId = ?')
    .bind(tableId, auth.userId).first<{ id: string; role: string }>();
  if (!p) return apiError('NOT_FOUND', 'Participation introuvable.');
  if (p.role === 'HOST') return apiError('HOST_CANNOT_LEAVE', "L'hote ne quitte pas, il annule.");
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE participations SET status = 'CANCELLED' WHERE id = ?").bind(p.id),
    c.env.DB.prepare('DELETE FROM contributions WHERE participationId = ?').bind(p.id),
  ]);
  return c.body(null, 204);
});
