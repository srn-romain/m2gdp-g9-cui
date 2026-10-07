import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';
import type { Env } from './env';
import { newId, nowIso } from './models';

function getBearer(c: { req: { header: (n: string) => string | undefined } }): string | null {
  const h = c.req.header('Authorization') ?? '';
  const m = h.match(/^Bearer (.+)$/);
  return m ? m[1] : null;
}

export async function verifyFirebaseIdToken(token: string, projectId: string) {
  const jwks = createRemoteJWKSet(
    new URL('https://www.googleapis.com/service_accounts/v1/jwks/securetoken@system.gserviceaccount.com'),
  );
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  return payload as { sub: string; email?: string };
}

/**
 * Jeton d'identité Firebase, vérifié par JWKS en production.
 * Avec l'émulateur d'authentification les jetons sont auto-signés : on se contente
 * de les décoder, comme le fait déjà `requireAuth`.
 */
export async function readFirebaseIdToken(token: string, projectId: string, emulator: boolean) {
  if (emulator) {
    const payload = decodeJwt(token) as { sub?: string; email?: string };
    if (!payload.sub) throw new Error('Jeton sans sujet.');
    return { sub: payload.sub, email: payload.email };
  }
  return verifyFirebaseIdToken(token, projectId);
}

/**
 * Les identifiants `users` sont des UUID générés côté serveur (convention UML), pas
 * l'UID Firebase : on relie l'identité Firebase au compte D1 par l'e-mail, en créant
 * le compte au premier appel si nécessaire.
 */
async function resolveUser(env: Env, firebaseEmail: string | undefined) {
  const email = (firebaseEmail ?? '').toLowerCase();
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

// Auth Bearer : session opaque 1h (tests/parcours) OU idToken Firebase (front).
export async function requireAuth(c: { req: { header: (n: string) => string | undefined }; env: Env }) {
  const token = getBearer(c);
  if (!token) return null;
  const env = c.env;
  if (env.FIREBASE_AUTH_EMULATOR === 'true') {
    try {
      const p = decodeJwt(token) as { sub?: string; email?: string };
      if (p.sub) {
        const compte = await resolveUser(env, p.email);
        if (compte) return compte;
      }
    } catch { /* tombe sur session opaque */ }
  }
  const now = new Date().toISOString();
  const sess = await env.DB.prepare(
    'SELECT id, userId, expiresAt, revokedAt FROM sessions WHERE id = ?',
  ).bind(token).first<{ id: string; userId: string; expiresAt: string; revokedAt: string | null }>();
  if (sess && !sess.revokedAt && sess.expiresAt > now) return { userId: sess.userId };
  try {
    const p = await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID);
    return await resolveUser(env, p.email);
  } catch {
    return null;
  }
}
