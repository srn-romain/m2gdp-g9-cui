# Déploiement Supabase — La Bonne Tablée

Ce document décrit, pas à pas, la mise en service de la migration
Firebase → Supabase portée par la branche `feature/supabase-migration`.

## Périmètre de la branche

- Firebase Authentication (lien magique) est remplacé par Supabase Auth.
- Le miroir Firestore du profil est supprimé : la source de vérité reste D1
  (`GET`/`PATCH /me` via le Worker).
- La présence Realtime Database est supprimée (le code n'était pas branché sur les écrans).
- Le Worker vérifie désormais un jeton Supabase via le JWKS public du projet.
- L'API Hono, D1 et R2 restent inchangés : ils continuent de tourner sur Cloudflare Workers.

Supabase ne fournit pas d'hébergement de site statique générique. Le front Vue
est un build statique (`public/dist`) servi par Cloudflare Pages.

## 1. Créer le projet Supabase

1. Ouvrir https://supabase.com/dashboard et se connecter.
2. Cliquer sur New project.
3. Choisir une organisation et un nom, par exemple `labonnetablee`.
4. Choisir une région proche du trafic (pour la France : `eu-west-1` ou équivalent).
5. Conserver un mot de passe de base de données sûr.
6. Noter le Project Reference (visible dans l'URL du projet).

## 2. Récupérer les clés

1. Aller dans Project Settings → API.
2. Copier Project URL : `https://<project-ref>.supabase.co`.
3. Copier la clé publishable `sb_publishable_...` (ou, en transition, la clé
   `anon` dans l'onglet Legacy API keys).

Les clés `anon` et `service_role` sont dépréciées fin 2026 au profit des clés
`publishable` et `secret`.
Source : https://supabase.com/docs/guides/api/creating-routes

La clé publishable est publique par conception ; la clé `service_role`/`secret`
ne doit jamais être exposée au front.

## 3. Configurer l'authentification

1. Aller dans Authentication → Sign In / Providers.
2. Vérifier que le provider Email est activé (il l'est par défaut).
3. Aller dans Authentication → URL Configuration.
4. Définir Site URL sur l'URL publique du front, par exemple
   `https://labonnetablee.pages.dev`.
5. Ajouter les Redirect URLs autorisées :

   ```
   https://labonnetablee.pages.dev/auth/finish
   http://localhost:5173/auth/finish
   http://127.0.0.1:5173/auth/finish
   ```

Le lien magique est envoyé par `signInWithOtp`. Il expire après 1 heure par
défaut et l'envoi est limité à une demande par minute.
Source : https://supabase.com/docs/guides/auth/auth-email-passwordless

## 4. Configurer le front

Créer ou compléter `public/.env.local` (fichier non versionné) :

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_API_URL=http://localhost:8787
VITE_DEMO_MODE=false
```

Le modèle est dans [public/.env.example](../public/.env.example).

## 5. Configurer le Worker

Le Worker n'a besoin que de l'URL du projet pour vérifier les jetons via le JWKS :

```
SUPABASE_URL=https://<project-ref>.supabase.co
```

En local, ajouter cette ligne dans `workers/.dev.vars`. En production, la poser
comme secret ou variable d'environnement du Worker :

```sh
cd workers
npx wrangler secret put SUPABASE_URL
```

Le Worker vérifie le jeton avec `jose` contre
`https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`.
Source : https://supabase.com/docs/guides/auth/jwts?queryGroups=language&language=ts

## 6. Vérifier en local

Dans deux terminaux :

```sh
# 1. Worker
cd workers && npm run dev

# 2. Front
cd public && npm run dev
```

Puis vérifier :

```sh
curl -i http://localhost:8787/api/health
curl -i http://localhost:8787/api/v1/me   # 401 attendu
```

Tester le parcours complet : créer un compte → recevoir le lien Supabase →
`/auth/finish` → accueil → profil.

## 7. Déployer le Worker

```sh
cd workers
npx wrangler d1 migrations apply labonnetablee-db --remote
npx wrangler secret put SUPABASE_URL
npx wrangler deploy
```

Le Worker déployé reste sur Cloudflare ; il utilise Supabase uniquement pour
l'identité des utilisateurs.

## 8. Déployer le front

Construire avec les variables de production :

```sh
cd public
VITE_SUPABASE_URL=https://<project-ref>.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
VITE_API_URL=https://labonnetablee-api.poc-m2gdp-g9-cui-api.workers.dev \
VITE_DEMO_MODE=false \
npm run build
```

Publier `public/dist` sur Cloudflare Pages :

```sh
npx wrangler pages deploy dist --project-name labonnetablee
```

Le fallback SPA est déjà fourni par `public/static/_redirects`.

## 9. Comptes existants

Aucune migration d'utilisateurs n'est nécessaire : les profils vivent dans D1 et
sont reliés à l'identité par l'e-mail. Un utilisateur existant se reconnecte avec
le même e-mail ; Supabase crée alors son identité et le Worker relie cet e-mail au
compte D1 existant.

Les liens magiques Supabase envoyés avant le déploiement ne sont plus valables : demander un
nouveau lien après le déploiement.

## 10. Checklist de mise en service

- [ ] Projet Supabase créé et région choisie.
- [ ] Provider Email activé.
- [ ] Site URL et Redirect URLs configurés.
- [ ] `public/.env.local` renseigné.
- [ ] `workers/.dev.vars` contient `SUPABASE_URL`.
- [ ] `GET /api/health` répond `200`.
- [ ] `GET /api/v1/me` sans jeton répond `401`.
- [ ] Le lien magique Supabase ouvre `/auth/finish` et connecte l'utilisateur.
- [ ] Le Worker déployé possède la variable `SUPABASE_URL`.
- [ ] Le front est construit avec les variables de production.

## Rollback

- Front : redéployer le build de la branche `main`.
- Worker : `npx wrangler rollback --version-id <id>`.
- Auth : revenir à un commit antérieur si la configuration Supabase doit être
  annulée ; les profils restent dans D1.

## Prochaine étape possible

La branche migre uniquement l'authentification. Une migration complète des données
vers Supabase Postgres (remplacement de D1) et des fichiers vers Supabase Storage
(remplacement de R2) ferait l'objet d'une branche séparée.
