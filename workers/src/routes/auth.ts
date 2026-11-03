import { Hono } from 'hono';
import type { Env } from '../env';
import { apiError } from '../errors';
import { newId, nowIso } from '../models';
import { verifySupabaseIdToken } from '../auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hits = new Map<string, number[]>();

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.post('/magic-links', async (c) => {
  const body = await c.req.json().catch(() => null) as { email?: string } | null;
  if (!body || typeof body.email !== 'string' || !EMAIL_RE.test(body.email) || body.email.length > 254) {
    return apiError('VALIDATION_ERROR', 'Adresse e-mail invalide.', { field: 'email' });
  }
  const email = body.email.toLowerCase();
  const now = Date.now();
  const arr = (hits.get(email) ?? []).filter((t) => now - t < 3600_000);
  if (arr.length >= 5) return apiError('RATE_LIMITED', 'Trop de demandes, reessayez plus tard.', { field: 'email' });
  arr.push(now);
  hits.set(email, arr);
  const token = `ml_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const created = nowIso();
  const expires = new Date(now + 15 * 60000).toISOString();
  await c.env.DB.prepare(
    'INSERT INTO magic_links (token, email, expiresAt, usedAt, createdAt) VALUES (?, ?, ?, NULL, ?)',
  ).bind(token, email, expires, created).run().catch(() => {});
  return c.body(null, 202);
});

authRoutes.post('/sessions', async (c) => {
  const body = await c.req.json().catch(() => null) as { token?: string } | null;
  if (!body || typeof body.token !== 'string' || !body.token) {
    return apiError('VALIDATION_ERROR', 'Jeton manquant.', { field: 'token' });
  }
  const now = nowIso();
  const magic = await c.env.DB.prepare(
    'SELECT token, email, expiresAt, usedAt FROM magic_links WHERE token = ?',
  ).bind(body.token).first<{ token: string; email: string; expiresAt: string; usedAt: string | null }>();
  let email: string | undefined;
  let passthroughSupabase = false;
  if (magic) {
    if (magic.usedAt || magic.expiresAt <= now) return apiError('UNAUTHENTICATED', 'Jeton expire ou deja utilise.');
    await c.env.DB.prepare('UPDATE magic_links SET usedAt = ? WHERE token = ?').bind(now, magic.token).run();
    email = magic.email;
  } else {
    try {
      if (!c.env.SUPABASE_URL) throw new Error('SUPABASE_URL absent.');
      const p = await verifySupabaseIdToken(body.token, c.env.SUPABASE_URL);
      email = (p.email ?? '').toLowerCase();
      if (!email) return apiError('UNAUTHENTICATED', 'Jeton invalide.');
      passthroughSupabase = true;
    } catch {
      return apiError('UNAUTHENTICATED', 'Jeton invalide.');
    }
  }
  const found = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email)
    .first<{ id: string }>();
  const userId = found?.id ?? newId();
  if (!found) {
    await c.env.DB.prepare(
      "INSERT INTO users (id, email, firstName, lastName, neighborhood, city, dietaryPreferences, status, createdAt, updatedAt) VALUES (?, ?, '', '', '', '', '[]', 'ACTIVE', ?, ?)",
    ).bind(userId, email, now, now).run();
  }
  if (passthroughSupabase) {
    return c.json({ accessToken: body.token, tokenType: 'Bearer', expiresIn: 3600 }, 201);
  }
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 3600_000).toISOString();
  await c.env.DB.prepare(
    'INSERT INTO sessions (id, userId, createdAt, expiresAt, revokedAt, ip, ua) VALUES (?, ?, ?, ?, NULL, ?, ?)',
  ).bind(sessionId, userId, now, expiresAt, c.req.header('CF-Connecting-IP') ?? null, c.req.header('User-Agent') ?? null).run();
  return c.json({ accessToken: sessionId, tokenType: 'Bearer', expiresIn: 3600 }, 201);
});
