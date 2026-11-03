import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from './env';
import { newId, nowIso } from './models';

function getBearer(c: { req: { header: (n: string) => string | undefined } }): string | null {
  const h = c.req.header('Authorization') ?? '';
  const m = h.match(/^Bearer (.+)$/);
  return m ? m[1] : null;
}

/**
 * Vérifie un jeton d'accès Supabase contre le JWKS public du projet.
 * Source : https://supabase.com/docs/guides/auth/jwts?queryGroups=language&language=ts
 */
export async function verifySupabaseIdToken(token: string, supabaseUrl: string) {
  const base = supabaseUrl.replace(/\/$/, '');
  const jwks = createRemoteJWKSet(
    new URL(`${base}/auth/v1/.well-known/jwks.json`),
  );
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `${base}/auth/v1`,
    audience: 'authenticated',
  });
  return payload as { sub: string; email?: string; role?: string };
}

/**
 * Identifiants `users` : UUID générés côté serveur (convention UML). On relie
 * l'identité Supabase au compte D1 par l'e-mail, en créant le compte au premier appel.
 */
async function resolveUser(env: Env, authEmail: string | undefined) {
  const email = (authEmail ?? '').toLowerCase();
  if (!email) return null;
  const existe = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email).first<{ id: string }>();
  if (existe) return { userId: existe.id, email };
  const id = newId();
  const now = nowIso();
  await env.DB.prepare(
    "INSERT INTO users (id, email, firstName, lastName, neighborhood, city, dietaryPreferences, status, createdAt, updatedAt) VALUES (?, ?, '', '', '', '', '[]', 'ACTIVE', ?, ?)",
  ).bind(id, email, now, now).run();
  return { userId: id, email };
}

// Auth Bearer : session opaque 1h (tests/parcours) OU accessToken Supabase (front).
export async function requireAuth(c: { req: { header: (n: string) => string | undefined }; env: Env }) {
  const token = getBearer(c);
  if (!token) return null;
  const env = c.env;
  const now = new Date().toISOString();
  const sess = await env.DB.prepare(
    'SELECT id, userId, expiresAt, revokedAt FROM sessions WHERE id = ?',
  ).bind(token).first<{ id: string; userId: string; expiresAt: string; revokedAt: string | null }>();
  if (sess && !sess.revokedAt && sess.expiresAt > now) return { userId: sess.userId };
  if (!env.SUPABASE_URL) return null;
  try {
    const p = await verifySupabaseIdToken(token, env.SUPABASE_URL);
    return await resolveUser(env, p.email);
  } catch {
    return null;
  }
}
