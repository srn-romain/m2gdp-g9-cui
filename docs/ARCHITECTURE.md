# ARCHITECTURE — La Bonne Tablee (prod)

La production a remplace Firebase par Supabase Auth et Cloudflare Pages.
Le POC historique reste documente dans `specs/IMPLEMENTATION-ARCHITECTURE.md`.

Schema :

- `landing/` : dossier de projet statique -> Cloudflare Pages projet `labonnetablee-depot`.
- `landing-vitrine/` : site vitrine statique -> Cloudflare Pages projet `labonnetablee-landing`.
- `public/` : app Vue 3 + shadcn-vue PWA (racine Vite, publicDir `static`, build `public/dist`).
  Le fichier `public/static/_redirects` assure le fallback SPA.
- `workers/` : API Hono, base unique `/api/v1`, D1 (metier) + R2 (avatars).
- Auth : lien magique Supabase. Le Worker verifie le jeton via `jose` + JWKS
  (`<SUPABASE_URL>/auth/v1/.well-known/jwks.json`). `POST /auth/magic-links` et
  `POST /auth/sessions` restent disponibles pour le parcours de test et les tests e2e.
- Donnees : D1 prod (`workers/migrations/0001_prod_init.sql`), conventions UML
  (UUID v4 serveur, Instant ISO8601 UTC, enums UPPER_SNAKE, Decimal jamais float,
  champs calcules jamais stockes). Titre `{dishName} chez {host.firstName}` derive.
- Regles R1-R11 + confidentialite R7/R8 codees cote Worker (voir `workers/src/`).
- Listes `{data, pagination}`, erreurs `{error:{code,message,details}}`, codes stables
  (voir `docs/API.md`). Pagination obligatoire sur /tables, /me/tables, messages.
