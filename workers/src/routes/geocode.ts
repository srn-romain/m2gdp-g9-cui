import { Hono } from 'hono';
import type { Env } from '../env';
import { apiError } from '../errors';
import { requireAuth } from '../auth';

// Proxy geocode Google (cle serveur en secret Worker uniquement, jamais front).
export const geocodeRoutes = new Hono<{ Bindings: Env }>();
geocodeRoutes.get('/', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const url = new URL(c.req.url);
  const address = url.searchParams.get('address');
  if (!address) return apiError('VALIDATION_ERROR', 'address requis.', { field: 'address' });
  const key = c.env.GOOGLE_MAPS_API_KEY;
  if (!key) return apiError('INTERNAL_ERROR', 'Geocodage indisponible.');
  const lang = url.searchParams.get('lang') ?? 'fr';
  const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&language=${lang}&key=${key}`);
  const j = await r.json() as { status: string; results: Array<{ formatted_address: string; geometry: { location: { lat: number; lng: number } }; place_id: string }> };
  if (j.status === 'ZERO_RESULTS' || !j.results.length) return apiError('NOT_FOUND', 'Adresse introuvable.');
  if (j.status !== 'OK') return apiError('INTERNAL_ERROR', 'Geocodage indisponible.');
  const f = j.results[0];
  return c.json({ formatted: f.formatted_address, lat: f.geometry.location.lat, lng: f.geometry.location.lng, placeId: f.place_id });
});
