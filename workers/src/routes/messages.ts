import { Hono } from 'hono';
import type { Env } from '../env';
import { apiError } from '../errors';
import { parsePagination, pageOf } from '../pagination';
import { requireAuth } from '../auth';
import { newId, nowIso, toMessageJson, type MessageRow } from '../models';

export const messagesRoutes = new Hono<{ Bindings: Env }>();

async function canRead(db: D1Database, tableId: string, userId: string) {
  const t = await db.prepare('SELECT hostId FROM tables WHERE id = ?').bind(tableId).first<{ hostId: string }>();
  if (!t) return 'missing' as const;
  if (t.hostId === userId) return 'ok' as const;
  const p = await db.prepare("SELECT id FROM participations WHERE tableId = ? AND userId = ? AND status = 'CONFIRMED'")
    .bind(tableId, userId).first();
  return p ? ('ok' as const) : ('forbidden' as const);
}

messagesRoutes.get('/tables/:tableId/messages', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const tableId = c.req.param('tableId');
  const access = await canRead(c.env.DB, tableId, auth.userId);
  if (access === 'missing') return apiError('NOT_FOUND', 'Tablee introuvable.');
  if (access === 'forbidden') return apiError('FORBIDDEN', 'Fil reserve aux participants confirmes.');
  const { page, pageSize } = parsePagination(new URL(c.req.url));
  const total = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM messages WHERE tableId = ?').bind(tableId).first<{ n: number }>();
  const rows = await c.env.DB.prepare('SELECT * FROM messages WHERE tableId = ? ORDER BY sentAt DESC LIMIT ? OFFSET ?')
    .bind(tableId, pageSize, (page - 1) * pageSize).all();
  // Chaque message porte son auteur : le fil affiche qui a parlé.
  const items = [];
  for (const row of rows.results ?? []) items.push(await toMessageJson(c.env.DB, row as unknown as MessageRow));
  return c.json(pageOf(items, total?.n ?? 0, page, pageSize));
});

messagesRoutes.post('/tables/:tableId/messages', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const tableId = c.req.param('tableId');
  const t = await c.env.DB.prepare('SELECT id, status FROM tables WHERE id = ?').bind(tableId).first<{ id: string; status: string }>();
  if (!t) return apiError('NOT_FOUND', 'Tablee introuvable.');
  if (t.status === 'CANCELLED' || t.status === 'PASSED') return apiError('FORBIDDEN', 'Fil en lecture seule.');
  const access = await canRead(c.env.DB, tableId, auth.userId);
  if (access !== 'ok') return apiError('FORBIDDEN', 'Fil reserve aux participants confirmes.');
  const b = await c.req.json().catch(() => null) as { type?: string; text?: string; audioUrl?: string; imageUrl?: string; durationSeconds?: number } | null;
  if (!b || (b.type !== 'TEXT' && b.type !== 'AUDIO' && b.type !== 'IMAGE')) return apiError('VALIDATION_ERROR', 'type invalide.', { field: 'type' });
  if (b.type === 'TEXT' && (!b.text || !b.text.trim() || b.text.length > 2000)) return apiError('VALIDATION_ERROR', 'text invalide.', { field: 'text' });
  if (b.type === 'AUDIO' && (!b.audioUrl || typeof b.audioUrl !== 'string')) return apiError('VALIDATION_ERROR', 'audioUrl invalide.', { field: 'audioUrl' });
  if (b.type === 'IMAGE' && (!b.imageUrl || typeof b.imageUrl !== 'string')) return apiError('VALIDATION_ERROR', 'imageUrl invalide.', { field: 'imageUrl' });
  const id = newId(), now = nowIso();
  await c.env.DB.prepare(
    'INSERT INTO messages (id, tableId, authorId, type, text, audioUrl, imageUrl, durationSeconds, sentAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(
    id, tableId, auth.userId, b.type,
    b.type === 'TEXT' ? b.text!.trim() : null,
    b.type === 'AUDIO' ? b.audioUrl : null,
    b.type === 'IMAGE' ? b.imageUrl : null,
    b.durationSeconds ?? null, now,
  ).run();
  const m = await c.env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first<MessageRow>();
  if (!m) return apiError('INTERNAL_ERROR', 'Message non enregistre.');
  return c.json(await toMessageJson(c.env.DB, m), 201);
});
