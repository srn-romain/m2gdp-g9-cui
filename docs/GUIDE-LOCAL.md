# GUIDE-LOCAL

## Deux terminaux

```sh
# 1. API Workers sur http://localhost:8787 (base /api/v1)
cd workers && npm install
npx wrangler d1 migrations apply labonnetablee-db --local   # une fois, Worker arrêté
npx wrangler dev --port 8787

# 2. Front sur http://localhost:5173
cd public && npm install && npm run dev
```

L'authentification utilise directement le projet Supabase heberge : aucune emulation
locale n'est necessaire. Le modele definit `VITE_API_URL=http://localhost:8787` ; si la
variable est vide, le client retombe aussi sur cette valeur par defaut.

## Configuration

`public/.env.local` (non versionne) :

```sh
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_DEMO_MODE=false
```

`workers/.dev.vars` (non versionne) :

```sh
SUPABASE_URL=https://<project-ref>.supabase.co
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

## Lien magique en local

Supabase envoie le lien a l'adresse reelle. Pour le developpement, le lien ramene sur
`http://localhost:5173/auth/finish` si cette URL est declaree dans Supabase
(Authentication → URL Configuration → Redirect URLs).

## Points de vigilance

- **Arreter `wrangler dev` avant `d1 migrations apply --local`** : les deux ecrivent le
  meme fichier SQLite, sinon le Worker plante sur `SQLITE_BUSY`.
- Changer `database_id` dans `wrangler.toml` cree une base locale **vide** : reappliquer
  les migrations.
- Mobile sur le reseau local : le front remplace `localhost` par le hostname courant.
- Parcours metier complet : `specs/openapi/parcours.http` (adapter la baseUrl vers 8787).

## Mode demo

`VITE_DEMO_MODE=true` remplace l'API par `public/src/lib/mock.ts` et ouvre une session
fictive au premier clic : pratique pour relire le design sans rien demarrer d'autre.

## Jeu de donnees de test

`workers/seed/menus.sql` seme 100 tablees dans 20 villes, avec leurs hotes, des invites,
des apports et la liste d'ingredients proposee par chaque hote. Le script est rejouable :
il purge d'abord ses propres lignes (comptes `seed.*@labonnetablee.test`).

```sh
# Arreter wrangler dev d'abord (meme fichier SQLite).
cd workers
npx wrangler d1 execute labonnetablee-db --local --file=seed/menus.sql
```
