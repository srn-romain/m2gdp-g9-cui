# tests — Playwright E2E (prod)

- `tests/e2e/smoke.spec.ts` : sante API + parcours critique (202 meme si inconnu, 401, 404, 409, 422).
- Parcours metier complet : `specs/openapi/parcours.http` (requetes 1-15, dans l'ordre).
- Vitest : dans `public/src` et `workers` (unitaires colles au code).
