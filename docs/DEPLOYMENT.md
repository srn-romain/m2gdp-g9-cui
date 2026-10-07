# DEPLOYMENT

Pré-requis : Node 22+, npm 10+, `firebase-tools` — utiliser `npx firebase-tools@latest`,
la commande globale `firebase` est cassée sur ce poste — et Wrangler v4.

## Environnements

| Élément | Valeur |
|---|---|
| Projet Firebase | `labonnetablee-cb767` (compte nhistoriques@gmail.com) |
| App web Firebase | `1:493630874510:web:5bd8399c2adb40dcd27adf` |
| Site hosting `app` | `labonnetablee` → https://labonnetablee.web.app |
| Site hosting `landing` | `labonnetablee-landing` → https://labonnetablee-landing.web.app |
| Compte Cloudflare | nhistoriques@gmail.com |
| Worker | `labonnetablee-api` → https://labonnetablee-api.poc-m2gdp-g9-cui-api.workers.dev |
| Base D1 | `labonnetablee-db` — `2db9f691-380d-4f38-ab36-5b73430fc42e` (WEUR) |
| Bucket R2 | `labonnetablee-files` |

## Configuration du front

Trois fichiers, du plus partagé au plus local :

| Fichier | Versionné | Rôle |
|---|---|---|
| `public/.env` | oui | Configuration web Firebase (clé publique) |
| `public/.env.production` | oui | `VITE_API_URL` de l'API déployée, lue par `vite build` |
| `public/.env.local` | non | Surcharges de développement uniquement |

La clé web Firebase n'est pas un secret : elle est restreinte par les domaines autorisés
et par référent. La recherche d'adresse passe par l'API Adresse (Base Adresse Nationale),
service public gratuit et sans clé : aucun secret à gérer.

### Mode démo

Le site déployé tourne en **mode démo** (`VITE_DEMO_MODE=true` dans
`public/.env.production`) : les données viennent de `public/src/lib/mock.ts` et la
connexion ouvre une session fictive, sans Firebase ni API. C'est ce qui permet de relire
les écrans sur un téléphone pendant la phase de design.

Avant la mise en production réelle : passer `VITE_DEMO_MODE` à `false`, activer la
connexion par lien magique dans la console Firebase, puis redéployer.

## Déploiement

1. **API** (Cloudflare)

   ```sh
   cd workers
   npx wrangler d1 migrations apply labonnetablee-db --remote
   npx wrangler deploy
   ```

   Secrets optionnels : `npx wrangler secret put R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY` (envoi d'avatars).

2. **Front** (Firebase Hosting)

   ```sh
   cd public && npm run build
   npx firebase-tools@latest deploy --only hosting --project labonnetablee-cb767
   ```

   Toujours passer par `--only hosting` : `firebase.json` déclare aussi les règles
   Firestore / RTDB / Storage, or ces services ne sont pas activés sur ce projet
   (le métier vit dans D1, les avatars dans R2). Un `firebase deploy` sans filtre échoue.

3. **Console Firebase — manuel, une seule fois**

   - Authentication → Sign-in method → activer **E-mail/lien magique**.
   - Authentication → Settings → Domaines autorisés : ajouter `labonnetablee.web.app`
     (`localhost`, `labonnetablee-cb767.firebaseapp.com` et
     `labonnetablee-cb767.web.app` sont présents d'origine), plus tout domaine
     personnalisé ajouté ensuite.

   Sans cette activation, `POST /auth/magic-links` répond 202 mais aucun e-mail ne part.
   Sans le domaine dans la liste, l'envoi échoue avec `auth/unauthorized-continue-uri`.

   Note : `<projet>.web.app` et `<projet>.firebaseapp.com` sont générés par Firebase et
   ne peuvent pas être supprimés. `labonnetablee-cb767.web.app` continue donc de servir
   l'application ; l'URL de référence reste `labonnetablee.web.app`.

## Vérifications

```sh
curl https://labonnetablee-api.poc-m2gdp-g9-cui-api.workers.dev/api/health
curl -i https://labonnetablee-api.poc-m2gdp-g9-cui-api.workers.dev/api/v1/me   # 401 attendu
curl -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.fr"}' \
  https://labonnetablee-api.poc-m2gdp-g9-cui-api.workers.dev/api/v1/auth/magic-links  # 202 attendu
```

Puis le parcours complet : https://labonnetablee.web.app → « Créer un compte » →
lien reçu par e-mail → accueil.

## Rollback

- Hosting : `firebase hosting:clone` (pas de rollback natif), ou redéployer un commit antérieur.
- Worker : `npx wrangler rollback --version-id <id>`.
- D1 : append-only, migration corrective.

## CI

`.github/workflows/ci.yml` vérifie aujourd'hui types, build et tests. Aucun déploiement
automatique n'est branché : il faudrait ajouter `FIREBASE_TOKEN` et
`CLOUDFLARE_API_TOKEN` dans les secrets du dépôt.
