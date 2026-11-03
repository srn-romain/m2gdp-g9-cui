# La Bonne Tablee — partage de repas entre voisins

Socle : Supabase Auth + Workers Hono + D1 + R2, hosting statique Cloudflare Pages.
Metier : `specs/` (README, uml/modele-donnees, openapi/openapi.yaml, parcours.http).
Technique : `specs/IMPLEMENTATION-ARCHITECTURE.md` (POC), `docs/ARCHITECTURE.md` (prod),
cadrage : `agents.md`.

## Prerequis

Node 22+, npm 10+, Wrangler v4, un projet Supabase, un compte Cloudflare.

```sh
npm install -g wrangler
```

## Installation (une fois)

```sh
cd public && npm install && cd ..
cd workers && npm install && cd ..
cd tests && npm install && cd ..
cp workers/.dev.vars.example workers/.dev.vars
cp public/.env.example public/.env.local
```

Renseigner ensuite `public/.env.local` (URL et cle publishable Supabase) et
`workers/.dev.vars` (`SUPABASE_URL`, cles R2).

## Lancer en dev (2 terminaux)

```sh
# 1. Front (http://localhost:5173)
cd public && npm run dev

# 2. API (http://localhost:8787, base /api/v1)
cd workers && npm run dev
```

Sante API : http://localhost:8787/api/health (attendu `{"ok":true}`).
Parcours metier : `specs/openapi/parcours.http`, requetes 1 a 15 dans l'ordre, avec
`@baseUrl = http://localhost:8787/api/v1` en dev.

## Compiler et verifier

```sh
cd public && npm run type-check
cd public && npm run build        # sort dans public/dist
cd workers && npm run type-check
```

## Tester

```sh
cd workers && npm test
cd public && npm test
cd tests && npx playwright install && API_URL=http://localhost:8787 npm run e2e
```

## Base D1 en local

```sh
cd workers && npx wrangler d1 migrations apply labonnetablee-db --local
```

## Deployer

```sh
cd workers && npx wrangler d1 migrations apply labonnetablee-db --remote
cd workers && npx wrangler deploy

cd public && npm run build
npx wrangler pages deploy public/dist --project-name labonnetablee

npx wrangler pages deploy landing --project-name labonnetablee-landing
```

Detail : `docs/GUIDE-LOCAL.md` (local), `docs/SUPABASE-DEPLOYMENT.md` (Supabase),
`docs/DEPLOYMENT.md` (Cloudflare), `docs/API.md` (conventions /api/v1).
