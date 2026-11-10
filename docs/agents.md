# AGENTS.md - Cadrage implementation La Bonne Tablee

## 1. Role

Tu implementes le projet prod << La Bonne Tablee >> : partage de repas entre voisins.
Socle prouve : POC deepcode, migration production vers Supabase Auth + Workers Hono +
D1 + R2, hosting statique Cloudflare Pages.
Reference metier : docs/scenNominal (README, uml/modele-donnees.md + .mmd,
openapi/openapi.yaml, openapi/parcours.http).
Reference technique : docs/ARCHITECTURE.md (prod) et
specs/IMPLEMENTATION-ARCHITECTURE.md (POC historique).

## 2. Squelette de repo OBLIGATOIRE

- /landing : dossier de projet statique -> Cloudflare Pages projet `labonnetablee-depot`.
- /landing-vitrine : site vitrine statique -> Cloudflare Pages projet `labonnetablee-landing`.
- /public : app Vue 3 + shadcn-vue PWA, racine Vite, publicDir=static, build -> public/dist.
- /workers : API Cloudflare Workers Hono, base /api/v1, D1 + R2.
- /docs : dont docs/agents.md (ce fichier), docs/scenNominal ne se modifie pas sans PO.
- /design, /specs, /tests : inchanges dans leur role.
- Racine : agents.md.

Ne jamais creer de dossier hors squelette (sauf .github/, .gitignore, .mcp.json).
Les deployments statiques passent par Cloudflare Pages, pas par Firebase Hosting.

## 3. Regles intangibles

- Langue : commits et docs en francais, code et identifiants en anglais.
- Commits : Conventional Commits (feat:, fix:, docs:, test:, chore:).
- API : docs/scenNominal/openapi/openapi.yaml fait foi. Base /api/v1 unique.
  Listes -> {data, pagination}. Erreurs -> {error:{code,message,details}}.
  Codes stables : VALIDATION_ERROR, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND,
  TABLE_FULL, TABLE_CLOSED, TABLE_PASSED, ALREADY_PARTICIPATING,
  HOST_CANNOT_LEAVE, RATE_LIMITED, INTERNAL_ERROR.
- Donnees : conventions UML (UUID v4 serveur, Instant ISO8601 UTC, enums UPPER_SNAKE,
  Decimal jamais float, champs calcules jamais stockes).
- Vocabulaire : tablee=Table, hote=Participation HOST, participant=Participation,
  apport=Contribution, NONE=Je ne fais pas les courses, quartier=Location.neighborhood.
  Titre derive {dishName} chez {host.firstName}, jamais stocke.
- Auth : lien magique sans mot de passe gere par Supabase Auth. Le Worker verifie le
  jeton Supabase via jose + JWKS. `POST /auth/magic-links` reste disponible pour les
  tests et repond toujours 202. `POST /auth/sessions` cree une session Bearer 1h.
- Supabase : aucune cle service_role/secret dans le front ni dans les Workers.

## 4. Interdictions prod (R1-R11 + confidentialite)

- R1 : creation tablee = participation HOST CONFIRMED dans la meme transaction.
- R2 : seatsAvailable calcule, jamais ecrit.
- R3 : rejoindre exige OPEN + places + futur, sinon 409.
- R4 : une participation par (tableId,userId), sinon 409 ALREADY_PARTICIPATING.
- R5 : contribution liee a participation, 0..1. R6 : NONE => quantity/unit nuls.
- R7 : addressLine exacte reservee hote + confirmes ; autres = quartier + position 300m.
- R8 : messages reserves hote + confirmes, OPEN|FULL ; CANCELLED|PASSED lecture seule.
- R9 : hote ne quitte pas (409), il annule. R10 : PASSED apres fin, historique conserve.
- R11 : invite = ecriture limite a sa participation/contribution.
- Idempotency-Key UUID sur POST participations : rejouer = renvoyer l'existant.
- Pagination obligatoire sur /tables, /me/tables, messages (page/pageSize, max 100).

## 5. Tests et workflow

- Ordre : D1 migrations -> routes Worker -> front -> parcours.http 1-15 -> smoke 401/403/404/409/422.
- Tests : Vitest dans /public/src et workers, Playwright dans /tests.
- Avant chaque commit : type-check + build front, type-check worker.
- **Local d'abord** : toute modification doit etre validee en local (tests + build)
  avant de deployer en prod. Ne jamais deployer en prod sans validation locale.
- Hors perimetre (ticket post-prod, ne pas implementer) : avis, recettes, favoris,
  notifications, meteo, envoi medias, gestion hote PATCH, moderation.
- En cas de conflit POC vs scenNominal : le POC gagne sur l'infra,
  scenNominal gagne sur le metier. Documenter l'ecart dans le commit.
