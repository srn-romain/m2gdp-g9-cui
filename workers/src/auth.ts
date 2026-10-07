import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';
import type { Env } from './env';

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

// Auth Bearer : session opaque 1h (tests/parcours) OU idToken Firebase (front).
// Retourne { userId, email? }. L'appelant fait l'upsert user si besoin.
export async function requireAuth(c: { req: { header: (n: string) => string | undefined }; env: Env }) {
  const token = getBearer(c);
  if (!token) return null;
  const env = c.env;
  if (env.FIREBASE_AUTH_EMULATOR === 'true') {
    try {
      const p = decodeJwt(token) as { sub?: string; email?: string };
      if (p.sub) return { userId: p.sub, email: p.email };
    } catch { /* tombe sur session opaque */ }
  }
  const now = new Date().toISOString();
  const sess = await env.DB.prepare(
    'SELECT id, userId, expiresAt, revokedAt FROM sessions WHERE id = ?',
  ).bind(token).first<{ id: string; userId: string; expiresAt: string; revokedAt: string | null }>();
  if (sess && !sess.revokedAt && sess.expiresAt > now) return { userId: sess.userId };
  try {
    const p = await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID);
    return { userId: p.sub, email: p.email };
  } catch {
    return null;
  }
}
