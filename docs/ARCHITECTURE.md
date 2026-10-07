# ARCHITECTURE — La Bonne Tablee (prod)

Socle prouve : POC deepcode (Firebase + Workers Hono + D1 + R2, hosting multisite).
Detail : `specs/IMPLEMENTATION-ARCHITECTURE.md` (partie A = POC a reproduire, partie B = prod).

Schema :

- `landing/` : vitrine statique -> Hosting cible `landing`.
- `public/` : app Vue 3 + shadcn-vue PWA (racine Vite, publicDir `static`, build `public/dist`) -> cible `app`.
- `workers/` : API Hono, base unique `/api/v1`, D1 (metier) + R2 (avatars).
- Auth : lien magique Firebase sous le capot. `POST /auth/magic-links` -> 202 toujours ;
  `POST /auth/sessions` -> 201 `{accessToken, tokenType: Bearer, expiresIn: 3600}`.
  Bearer 1h verifie par le Worker (jose + JWKS). Pas d'Admin SDK dans les Workers.
- Donnees : D1 prod (`workers/migrations/0001_prod_init.sql`), conventions UML
  (UUID v4 serveur, Instant ISO8601 UTC, enums UPPER_SNAKE, Decimal jamais float,
  champs calcules jamais stockes). Titre `{dishName} chez {host.firstName}` derive.
- Regles R1-R11 + confidentialite R7/R8 codees cote Worker (voir `workers/src/`).
- Listes `{data, pagination}`, erreurs `{error:{code,message,details}}`, codes stables
  (voir `docs/API.md`). Pagination obligatoire sur /tables, /me/tables, messages.
