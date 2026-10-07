# La Bonne Tablee — partage de repas entre voisins

Socle : POC deepcode (Firebase + Workers Hono + D1 + R2, hosting multisite).
Metier : `specs/` (README, uml/modele-donnees, openapi/openapi.yaml, parcours.http).
Technique : `specs/IMPLEMENTATION-ARCHITECTURE.md`, cadrage : `agents.md`.

## Prerequis

Node 22+, npm 10+, firebase-tools, Wrangler v4, un projet Firebase unique (`m2gdp-g9-cui`).

```sh
npm install -g firebase-tools wrangler
```

## Installation (une fois)

```sh
cd public && npm install && cd ..
cd workers && npm install && cd ..
cd tests && npm install && cd ..
cp workers/.dev.vars.example workers/.dev.vars
```

## Lancer en dev (3 terminaux)

```sh
# 1. Emulateurs Firebase (Auth 9099, Firestore 8081, RTDB 9000, Hosting 5001)
firebase emulators:start

# 2. Front (http://localhost:5173)
cd public && npm run dev

# 3. API (http://localhost:8787, base /api/v1)
cd workers && npm run dev
```

Sante API : http://localhost:8787/api/health (attendu `{"ok":true}`).
Parcours metier : `specs/openapi/parcours.http`, requetes 1 a 15 dans l'ordre, avec
`@baseUrl = http://localhost:8787/api/v1` en dev.

## Compiler et verifier

```sh
cd public && npm run type-check
cd public && npm run build        # sort dans public/dist (previsualiser : npm run preview)
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
cd workers && npm run deploy
firebase deploy --only hosting:landing,hosting:app,firestore:rules,database:rules
```

Detail : `docs/GUIDE-LOCAL.md` (local), `docs/DEPLOYMENT.md` (prod), `docs/API.md` (conventions /api/v1).
