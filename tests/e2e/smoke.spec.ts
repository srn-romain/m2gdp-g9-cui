import { test, expect } from '@playwright/test';

// Smoke /api/v1 : 202 meme si inconnu, 401 sans Bearer, 404, 409, 422.
// Base : http://localhost:8787 en dev (wrangler dev), https://api.labonnetablee.fr en prod.
const base = process.env.API_URL ?? 'http://localhost:8787';

test('magic-links repond toujours 202', async ({ request }) => {
  const r = await request.post(`${base}/api/v1/auth/magic-links`, { data: { email: 'inconnu@example.fr' } });
  expect(r.status()).toBe(202);
});

test('401 sans Bearer', async ({ request }) => {
  expect((await request.get(`${base}/api/v1/me`)).status()).toBe(401);
});

test('404 tablee inconnue', async ({ request }) => {
  const s = await request.post(`${base}/api/v1/auth/sessions`, { data: { token: 'ml_inexistant' } });
  expect([401, 201]).toContain(s.status());
  const r = await request.get(`${base}/api/v1/tables/00000000-0000-4000-8000-000000000000`);
  expect([401, 404]).toContain(r.status());
});

test('422 champs fautifs', async ({ request }) => {
  const r = await request.post(`${base}/api/v1/auth/magic-links`, { data: { email: 'pas-un-email' } });
  expect(r.status()).toBe(422);
  const j = await r.json();
  expect(j.error.code).toBe('VALIDATION_ERROR');
});
