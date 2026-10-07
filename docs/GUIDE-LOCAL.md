# GUIDE-LOCAL

## Trois terminaux

```sh
# 1. Émulateurs Firebase : Auth 9099, Firestore 8081, RTDB 9000, UI sur http://127.0.0.1:4000
npx firebase-tools@latest emulators:start --only auth,firestore,database

# 2. API Workers sur http://localhost:8787 (base /api/v1)
cd workers && npm install
npx wrangler d1 migrations apply labonnetablee-db --local   # une fois, Worker arrêté
npx wrangler dev --port 8787

# 3. Front sur http://localhost:5173
cd public && npm install && npm run dev
```

## Configuration

`public/.env.local` (non versionné) :

```sh
VITE_USE_FIREBASE_EMULATORS=true   # bascule Auth/Firestore/RTDB sur les émulateurs
VITE_DEMO_MODE=false               # false = vraie authentification
```

`VITE_API_URL` vide fait tomber le client sur `http://localhost:8787`.

`workers/.dev.vars` (non versionné) : `FIREBASE_AUTH_EMULATOR=true`, sinon le Worker
refuse les jetons auto-signés des émulateurs.

## Récupérer le lien magique en local

Les émulateurs n'envoient pas d'e-mail : le lien est visible dans l'UI
(<http://127.0.0.1:4000/auth>), ou par API :

```sh
curl -s http://127.0.0.1:9099/emulator/v1/projects/labonnetablee-cb767/oobCodes
```

## Points de vigilance

- **Arrêter `wrangler dev` avant `d1 migrations apply --local`** : les deux écrivent le
  même fichier SQLite, sinon le Worker plante sur `SQLITE_BUSY`.
- Changer `database_id` dans `wrangler.toml` crée une base locale **vide** : réappliquer
  les migrations.
- Mobile sur le réseau local : le front remplace `localhost` par le hostname courant.
- Parcours métier complet : `specs/openapi/parcours.http` (adapter la baseUrl vers 8787).

## Mode démo

`VITE_DEMO_MODE=true` remplace l'API par `public/src/lib/mock.ts` et ouvre une session
fictive au premier clic : pratique pour relire le design sans rien démarrer d'autre.

## Jeu de données de test

`workers/seed/menus.sql` sème 100 tablées dans 20 villes, avec leurs hôtes, des invités,
des apports et la liste d'ingrédients proposée par chaque hôte. Le script est rejouable :
il purge d'abord ses propres lignes (comptes `seed.*@labonnetablee.test`).

```sh
# Arrêter wrangler dev d'abord (même fichier SQLite).
cd workers
npx wrangler d1 execute labonnetablee-db --local --file=seed/menus.sql
```

Les créneaux sont calculés à l'application du script (aujourd'hui 19 h → 20 h 30 pour
les premières, puis sur 30 jours), donc le jeu reste toujours dans le futur.
