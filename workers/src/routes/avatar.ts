import { Hono } from 'hono';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Env } from '../env';
import { apiError } from '../errors';
import { requireAuth } from '../auth';

// Médias (photo de profil, image de message) stockés dans R2.
// POST /avatar/presign -> PUT (URL présignée, ou le Worker en repli) -> GET pour afficher.
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
};
const MAX = 5 * 1024 * 1024;

/** Préfixe autorisé : l'auteur ne peut écrire que chez lui. */
function prefixeAutorise(kind: string | undefined): string {
  return kind === 'message' ? 'messages' : 'avatars';
}

function cleAutorisee(key: string, userId: string): boolean {
  return key.startsWith(`avatars/${userId}/`) || key.startsWith(`messages/${userId}/`);
}

export const avatarRoutes = new Hono<{ Bindings: Env }>();

avatarRoutes.post('/presign', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const b = await c.req.json().catch(() => null) as
    | { contentType?: string; size?: number; kind?: string }
    | null;
  const ext = b?.contentType ? ALLOWED[b.contentType] : undefined;
  if (!ext || typeof b?.size !== 'number' || b.size <= 0 || b.size > MAX) {
    return apiError('VALIDATION_ERROR', 'contentType jpeg/png/webp/webm/mp4, size max 5 Mo.', {
      field: 'contentType',
    });
  }
  const key = `${prefixeAutorise(b?.kind)}/${auth.userId}/${crypto.randomUUID()}.${ext}`;
  if (c.env.R2_ACCOUNT_ID && c.env.R2_ACCESS_KEY_ID && c.env.R2_SECRET_ACCESS_KEY) {
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${c.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: c.env.R2_ACCESS_KEY_ID, secretAccessKey: c.env.R2_SECRET_ACCESS_KEY },
    });
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: 'labonnetablee-files', Key: key, ContentType: b.contentType }),
      { expiresIn: 600 },
    );
    return c.json({ key, uploadUrl, expiresIn: 600 });
  }
  return c.json({ key, uploadUrl: `/api/v1/avatar?key=${encodeURIComponent(key)}`, expiresIn: 600 });
});

avatarRoutes.put('/', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const key = new URL(c.req.url).searchParams.get('key') ?? '';
  if (!cleAutorisee(key, auth.userId)) return apiError('FORBIDDEN', 'Cle non autorisee.');
  const buf = await c.req.arrayBuffer();
  if (buf.byteLength > MAX) return apiError('VALIDATION_ERROR', 'Fichier trop lourd (5 Mo max).');
  const contentType = c.req.header('content-type') ?? 'image/jpeg';
  await c.env.FILES.put(key, buf, { httpMetadata: { contentType } });
  return c.json({ key });
});

/** Lecture publique : les clés sont imprévisibles, et une <img> n'envoie pas de jeton. */
avatarRoutes.get('/', async (c) => {
  const key = new URL(c.req.url).searchParams.get('key') ?? '';
  if (!key.startsWith('avatars/') && !key.startsWith('messages/')) {
    return apiError('FORBIDDEN', 'Cle non autorisee.');
  }
  const objet = await c.env.FILES.get(key);
  if (!objet) return apiError('NOT_FOUND', 'Media introuvable.');
  return new Response(objet.body, {
    headers: {
      'Content-Type': objet.httpMetadata?.contentType ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
});
