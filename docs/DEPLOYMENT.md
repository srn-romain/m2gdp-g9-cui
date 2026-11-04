# DEPLOYMENT — Cloudflare

Prerequis : Node 22+, npm 10+, Wrangler v4, un compte Cloudflare connecte via
`wrangler login`.

## Environnements

| Element | Valeur |
|---|---|
| Worker | `labonnetablee-api` → https://labonnetablee-api.poc-m2gdp-g9-cui-api.workers.dev |
| Base D1 | `labonnetablee-db` — `2db9f691-380d-4f38-ab36-5b73430fc42e` |
| Bucket R2 | `labonnetablee-files` |
| Pages app | projet `labonnetablee` → https://labonnetablee.pages.dev |
| Pages vitrine | projet `labonnetablee-landing` → https://labonnetablee-landing.pages.dev |
| Pages depot | projet `labonnetablee-depot` → https://labonnetablee-depot.pages.dev |

## Configuration du front

Trois fichiers, du plus partage au plus local :

| Fichier | Versionne | Role |
|---|---|---|
| `public/.env` | oui | Configuration Supabase (publishable, publique) |
| `public/.env.production` | oui | URL de l'API deployee et bascule demo |
| `public/.env.local` | non | Surcharges de developpement |

La cle publishable Supabase est publique par conception : la securite repose sur les
Row Level Security policies. La cle `service_role`/`secret` ne doit jamais etre dans
le front.

## Deploiement

1. **Worker**

   ```sh
   cd workers
   npx wrangler secret put SUPABASE_URL
   npx wrangler d1 migrations apply labonnetablee-db --remote
   npx wrangler deploy
   ```

2. **App**

   ```sh
   cd public
   npm run build
   npx wrangler pages deploy dist --project-name labonnetablee
   ```

   Le build embarque les variables de `public/.env.production`. `public/static/_redirects`
   fournit le fallback SPA (`/* /index.html 200`).
   Source : https://developers.cloudflare.com/pages/configuration/redirects/

3. **Site vitrine**

   ```sh
   npx wrangler pages deploy landing-vitrine --project-name labonnetablee-landing --branch feature/remove-firebase
   ```

4. **Dossier de projet**

   ```sh
   npx wrangler pages deploy landing --project-name labonnetablee-depot
   ```

## Verifications

```sh
curl https://labonnetablee-api.poc-m2gdp-g9-cui-api.workers.dev/api/health
curl -i https://labonnetablee-api.poc-m2gdp-g9-cui-api.workers.dev/api/v1/me   # 401 attendu
```

Puis le parcours complet sur https://labonnetablee.pages.dev → creer un compte →
lien magique Supabase → `/auth/finish` → profil.

## Rollback

- Worker : `npx wrangler rollback --version-id <id>`.
- Pages : `npx wrangler pages deployment list --project-name <projet>`, puis redeployer
  un artefact anterieur.
- D1 : append-only, migration corrective.
