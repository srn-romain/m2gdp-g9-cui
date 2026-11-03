# tests — Playwright E2E

- `tests/e2e/smoke.spec.ts` : sante API + statuts critiques (202, 401, 404, 409, 422).
  Nécessite le Worker sur `API_URL` (par défaut `http://localhost:8787`).
- `tests/e2e/usecases.spec.ts` : parcours UI en mode démo (pas d'API nécessaire).
- `tests/playwright.config.ts` : lance le front Vite en démo pour les tests UI.

Commandes :

```sh
npm run e2e:ui       # tests UI, serveur de démo démarré automatiquement
npm run e2e:smoke    # smoke API, nécessite le Worker
npm run e2e          # les deux
```

- Parcours métier complet : `specs/openapi/parcours.http` (requêtes 1-15, dans l'ordre).
- Vitest : dans `public/src` et `workers` (unitaires collés au code).
