# Document technique d'implementation - Architecture deepcode POC validee

> Note historique : ce document decrit le POC Firebase d'origine. La production actuelle
> utilise Supabase Auth, Cloudflare Pages et Workers/D1/R2 ; voir `docs/ARCHITECTURE.md`.

Ce document decrit exactement l'architecture prouvee dans ce repo pour la re-implementer a l'identique.
Tout vient du POC : landing, public, workers, docs, specs, firebase.json, .firebaserc, rules.

## 1. Ce que le POC a prouve

PWA Vue 3 avec inscription et connexion par lien magique Firebase, sans mot de passe.
Profil Firestore, presence Realtime Database, backend Cloudflare Workers Hono + D1 + R2.
Double hosting Firebase, geolocalisation Google proxifiee.

Flux valide :
saisie email -> sendSignInLinkToEmail -> ecran EmailSent -> clic lien /auth/finish ->
signInWithEmailLink -> creation Firestore si nouveau -> getIdToken ->
POST /api/sessions D1 -> presence RTDB -> /profile.

## 2. Squelette de repo a reproduire

```
deepcode/
  landing/       # site vitrine statique -> Hosting cible landing
  public/        # app Vue 3 PWA, racine Vite, publicDir=static, build -> public/dist
  workers/       # Worker Hono + D1 + R2
  docs/          # ARCHITECTURE.md, API.md, DEPLOYMENT.md, GUIDE-LOCAL.md
  design/        # maquettes HTML
  specs/         # api.openapi.yaml, sequences/lien-magique.md, POC_PLAN_V2.md
  tests/         # Playwright E2E
  firebase.json  # a la racine, obligatoire
  .firebaserc    # a la racine, obligatoire
  firestore.rules, database.rules.json, storage.rules
```

Ne creer aucun autre dossier sauf .github/, .gitignore, .mcp.json (outillage).

## 3. Versions figees du POC

Front public/package.json :
vue 3.4.21, vue-router 4.3.0, pinia 2.1.7, firebase 10.12.2,
@googlemaps/js-api-loader 1.16.8, leaflet 1.9.4, @vue-leaflet/vue-leaflet 0.10.1,
vite 5.2.8, vite-plugin-pwa 0.19.0, tailwindcss 3.4.3, typescript 5.4.5, vue-tsc 2.0.11.

Worker workers/package.json :
hono 4.7.0, jose 5.9.6, @aws-sdk/client-s3 3.700.0,
@aws-sdk/s3-request-presigner 3.700.0, wrangler 4.131.1,
compatibility_date 2026-09-09, compatibility_flags nodejs_compat.

Outils : Node 22+, npm 10+, firebase-tools latest, Wrangler v4.

## 4. Firebase - projet unique

Projet POC : m2gdp-g9-cui. Pour la re-implementation, creer ou reutiliser
un seul projet Firebase qui portera tout.

### 4.1 Auth Email Link

Activer Email Link uniquement. Domaines autorises : app-site-3f4aa.web.app,
localhost, et ton futur domaine custom.

Parametre critique cote front (public/src/stores/auth.ts) :

```
actionCodeSettings = { url: ACTION_URL, handleCodeInApp: true }
ACTION_URL dev  = http://localhost:5173/auth/finish
ACTION_URL prod = https://app-site-3f4aa.web.app/auth/finish
```

Deux appels SDK uniquement :
sendSignInLinkToEmail(auth, email, settings)
puis isSignInWithEmailLink + signInWithEmailLink(auth, email, href).
Stocker emailForSignIn en localStorage, le supprimer apres.
Si absent au retour, redemander l'email via prompt.
Nouveau vs retour : _tokenResponse.isNewUser avec fallback
metadata.creationTime === lastSignInTime.

### 4.2 Firestore

Collection unique users/{uid} :
{uid, email, firstName, lastName, avatarUrl, address, createdAt, updatedAt}.

firestore.rules exact a reproduire :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isSelf(uid) { return request.auth.uid == uid; }
    match /users/{uid} {
      allow read: if isSelf(uid);
      allow create: if isSelf(uid);
      allow update: if isSelf(uid) && request.resource.data.uid == uid;
      allow delete: if isSelf(uid);
    }
  }
}
```

Le Worker ne touche jamais Firestore. Decision volontaire :
Admin SDK non natif sur Workers. Le front ecrit via SDK + Rules.

### 4.3 Realtime Database (presence ephemere)

Chemin : users/{uid}/presence = {online:true, lastSeen: serverTimestamp()}
+ onDisconnect().remove(). Voir public/src/composables/usePresence.ts.
Deconnexion : remove(presence) -> signOut(auth) -> purge Pinia -> redirect /login.

database.rules.json exact :

```json
{
  "rules": {
    "users": {
      "$uid": {
        "presence": {
          ".read": "auth != null && auth.uid === $uid",
          ".write": "auth != null && auth.uid === $uid"
        }
      }
    }
  }
}
```

### 4.4 Hosting multisite

Deux sites dans le meme projet. Valeurs reelles du POC (.firebaserc) :
projet m2gdp-g9-cui, cible landing -> landing-site-afef3,
cible app -> app-site-3f4aa.

firebase.json exact a reproduire :

```json
{
  "hosting": [
    { "target": "landing", "public": "landing" },
    { "target": "app", "public": "public/dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }] }
  ],
  "firestore": { "rules": "firestore.rules" },
  "database": { "rules": "database.rules.json" },
  "storage": { "rules": "storage.rules" },
  "emulators": {
    "auth": { "port": 9099 }, "firestore": { "port": 8081 },
    "database": { "port": 9000 }, "hosting": { "port": 5001 },
    "storage": { "port": 9199 }, "ui": { "enabled": true }
  }
}
```

Le rewrite ** -> /index.html est obligatoire pour que /auth/finish
fonctionne en SPA. Creation une seule fois :
hosting:sites:create landing-site, app-site,
puis target:apply hosting landing landing-site et target:apply hosting app app-site.

## 5. Frontend /public - a l'identique

Racine Vite = /public, publicDir = static (evite /public/public),
build -> public/dist gitignore. Server port 5173, alias @ -> ./src.

vite.config.ts : plugin Vue, VitePWA registerType autoUpdate,
manifest Table Partagee, theme #E85D26, navigateFallback /index.html,
runtimeCaching CacheFirst images.unsplash.com (100 entrees) et
*.tile.openstreetmap.org (200 entrees) 30 jours.

Fichiers cles a reecrire :
- src/lib/firebase.ts : init VITE_FIREBASE_*, connectAuthEmulator,
  connectFirestoreEmulator, connectDatabaseEmulator si VITE_USE_FIREBASE_EMULATORS=true.
  Detection mobile LAN : si hostname != localhost, utiliser hostname courant
  comme host emulateur au lieu de 127.0.0.1.
- src/lib/api.ts : resolveApiUrl remplace localhost par hostname courant sur mobile.
  apiFetch injecte Authorization: Bearer getIdToken. Helpers apiGet, apiPost, apiDelete.
- src/stores/auth.ts : Pinia {user, isNewUser, loading},
  sendMagicLink, finishMagicLink, logout, initAuthListener.
- src/router/index.ts : /, /recettes, /login, /email-sent, /auth/finish,
  /profile, /sessions + guard requiresAuth / requiresGuest avec waitForAuth 1500ms.
- src/views : LoginView un champ email, EmailSentView, AuthFinishView
  (finishMagicLink puis POST /api/sessions puis redirect),
  ProfileView Leaflet + Places, SessionsView Mes appareils.
- src/composables : usePresence, useGooglePlaces (@googlemaps/js-api-loader),
  useProfile Firestore CRUD.

.env front :
VITE_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET,
MESSAGING_SENDER_ID, APP_ID, DATABASE_URL,
VITE_GOOGLE_MAPS_API_KEY = cle publique referrer uniquement,
VITE_API_URL=http://localhost:8787, VITE_USE_FIREBASE_EMULATORS=false.

## 6. Backend /workers - a l'identique

wrangler.toml exact :
name = deepcode-api, main = src/index.ts,
compatibility_date = 2026-09-09, nodejs_compat,
vars FIREBASE_PROJECT_ID = m2gdp-g9-cui,
D1 binding DB base deepcode-sessions id 4d108dfe-31c5-4ed5-afc7-92e9ebc824e7,
R2 binding FILES bucket deepcode-files.

src/index.ts : Hono + CORS allowlist localhost:5173, localhost:5001,
site.web.app, app.site.web.app + tolerance *.web.app pour previews.
GET /api/health public, GET /api/me verifie, montage /api/sessions,
/api/geocode, /api/avatar, 404 et 500 JSON {error:{code,message}}.

src/auth.ts : createRemoteJWKSet
(https://www.googleapis.com/service_accounts/v1/jwks/securetoken@system.gserviceaccount.com),
jwtVerify avec issuer https://securetoken.google.com/PROJECT_ID et audience PROJECT_ID.
Mode FIREBASE_AUTH_EMULATOR=true -> decodeJwt sans verif pour tests.
getBearerToken parse le header Bearer.

D1 migrations/0001_init.sql :
CREATE TABLE sessions
(id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
created_at INTEGER, expires_at INTEGER, revoked_at INTEGER, ip TEXT, ua TEXT).
POST /api/sessions cree UUID 24h. GET liste non revoquees tri created desc.
DELETE /:id fait UPDATE revoked_at, 204 ou 404.

routes/geocode.ts : GET /?address&lang=fr protege,
proxy maps.googleapis.com/maps/api/geocode/json avec cle serveur,
retour {formatted, lat, lng, placeId}. 400 sans address, 404 ZERO_RESULTS.

routes/avatar.ts : POST /presign {contentType, size}, types jpeg/png/webp max 5Mo,
key avatars/{uid}/{uuid}.ext. Si secrets S3 presents -> URL presignee 600s
bucket deepcode-files, sinon fallback {uploadUrl: /api/avatar?key=...}.
PUT /?key= via binding R2, verifie prefix avatars/{uid}/, 403 sinon, 413 si >5Mo.
Front fait ensuite updateDoc(users/uid, {avatarUrl:key}).

Secrets Worker (.dev.vars local, jamais committe) :
FIREBASE_PROJECT_ID, GOOGLE_MAPS_API_KEY serveur,
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.
Prod via wrangler secret put.

## 7. Cles Google et cartes

Deux cles separees : publique cote front restreinte referrer pour
places.Autocomplete, serveur en secret Worker uniquement pour geocode.
Front utilise place.geometry.location puis Leaflet LMap/LMarker tuiles OSM.
Si VITE_GOOGLE_MAPS_API_KEY vide ou API Places non activee, l'autocomplete ne charge pas.

## 8. PWA

vite-plugin-pwa manifest + workbox comme section 5.
Icones dans public/static/pwa-*.png. Verifier installabilite et offline apres build.

## 9. Ordre d'implementation recommande

1. Squelette + firebase.json, .firebaserc, rules, landing/index.html minimal.
2. Projet Firebase : Auth Email Link, Firestore, RTDB, 2 sites hosting + targets.
3. Scaffolder public Vite Vue TS Pinia Router Tailwind shadcn-vue.
4. firebase.ts, stores/auth.ts, router, LoginView, EmailSentView, AuthFinishView.
   Tester en emulateur : Auth 9099, Firestore 8081, RTDB 9000, Hosting 5001, UI 4000.
5. api.ts, usePresence, ProfileView, SessionsView, Leaflet + Places.
6. Scaffolder workers Hono + jose, wrangler.toml, auth.ts, db.ts, migration D1,
   routes health/me/sessions. Tester wrangler dev port 8787.
7. Ajouter geocode + avatar, creer D1 deepcode-sessions et R2 deepcode-files,
   d1 migrations apply --local puis --remote.
8. Cabler front -> worker, PWA, build vue-tsc --noEmit && vite build.
9. Tests Vitest front + worker, Playwright dans /tests.
10. Deploiement : wrangler deploy, firebase deploy hosting:landing,
    hosting:app, firestore:rules,database:rules. Restreindre cle publique au domaine app.
11. Smoke : /api/health, /api/me avec vrai idToken, POST/GET/DELETE sessions,
    geocode, presign + PUT, parcours lien magique complet, /auth/finish -> 200.
12. CI GitHub Actions : FIREBASE_TOKEN, CLOUDFLARE_API_TOKEN,
    job web type-check+build, deploy hosting sur main, deploy worker sur main.

## 10. Rollback

Hosting : hosting:clone site:previous (pas de rollback natif).
Worker : wrangler rollback --version-id ou redeployer depuis commit anterieur.
D1 : append-only, migration corrective si casse.

Reference source : docs/ARCHITECTURE.md, docs/API.md, docs/DEPLOYMENT.md,
docs/GUIDE-LOCAL.md, specs/api.openapi.yaml, specs/sequences/lien-magique.md,
workers/src, public/src, firebase.json, .firebaserc, firestore.rules.


---

## Partie B - Projet prod : La Bonne Tablee (scenario nominal)

Source de verite metier : docs/scenNominal/README.md,
docs/scenNominal/uml/modele-donnees.md + .mmd,
docs/scenNominal/openapi/openapi.yaml,
docs/scenNominal/openapi/parcours.http.
Le POC deepcode ci-dessus reste le socle technique prouve.
Ce qui change en prod : le nom, le vocabulaire, les entites et l'API /api/v1.

### B1. Parcours nominal a implementer (Bernard)

1. POST /auth/magic-links {email} -> 202, envoi lien (ecran Bon retour).
2. POST /auth/sessions {token} -> 201 {accessToken 1h}.
3. GET /me puis PATCH /me {firstName,lastName,neighborhood,city,coordinates,dietaryPreferences}.
4. GET /me/tables?scope=upcoming|past|all (Accueil A venir / Passees).
5. GET /tables?lat&lng&radiusKm&vegetarianOnly&startsAfter&startsBefore&query&sortBy (Explorer).
6. GET /tables/{tableId} (fiche Gratin dauphinois chez Leonie).
7. POST /tables/{tableId}/participations {contribution} + Idempotency-Key -> 201.
   Variante NONE : {label: Je ne fais pas les courses, category: NONE} sans quantity/unit.
8. GET + POST /tables/{tableId}/messages (fil Gratin chez Leonie).
9. Completer la boucle : POST /tables (Creer une tablee) et
   DELETE /tables/{tableId}/participations/me (se desinscrire).

Ordre de test exact : docs/scenNominal/openapi/parcours.http requetes 1 a 15,
baseUrl http://localhost:8080/api/v1 en dev, https://api.labonnetablee.fr/api/v1 en prod.
Cas d'erreur attendu : tablée complete -> 409 TABLE_FULL.

### B2. Correspondance POC -> La Bonne Tablee (ne pas re-coder l'infra)

POC prouve -> reutiliser tel quel :
- Hosting multisite landing/app + rewrite SPA, firebase.json/.firebaserc.
- Auth lien magique Firebase : sendSignInLinkToEmail + signInWithEmailLink.
- Firestore users/{uid} self-service + RTDB presence onDisconnect.
- Worker Hono + CORS + jose/JWKS + enveloppes erreur.
- R2 avatars via presign + PUT binding, Leaflet OSM, Places Autocomplete + proxy geocode.

Adaptation prod obligatoire :
- Base API : /api/v1 (version unique, evolutions par champs optionnels).
- Auth spec : POST /auth/magic-links repond toujours 202 (ne revele pas si email connu),
  rate-limit 429. POST /auth/sessions : token usage unique, expire 15 min, renvoie
  {accessToken, tokenType: Bearer, expiresIn: 3600}.
  Implementation conseillee : garder Firebase Email Link sous le capot.
  magic-links = envoi du lien Firebase, sessions = verification Firebase puis emission
  d'un accessToken 1h verifie par le Worker (jose). Bearer = cet accessToken.
- Firestore POC -> D1 prod pour le metier (voir B3). Garder Firestore uniquement si besoin
  transitoire profil ; sinon migrer User vers D1 et garder Firebase pour l'identite.
- Sessions D1 du POC -> remplacer par sessions accessToken 1h + refresh via nouveau magic-link.
- Erreurs : passer de {error:{code,message}} a {error:{code,message,details}}.
- Listes : passer a {data, pagination:{page,pageSize,totalItems,totalPages}}.
- Codes stables : VALIDATION_ERROR, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND,
  TABLE_FULL, TABLE_CLOSED, TABLE_PASSED, ALREADY_PARTICIPATING, HOST_CANNOT_LEAVE,
  RATE_LIMITED, INTERNAL_ERROR.

### B3. Modele de donnees D1 (depuis uml/modele-donnees.md)

Conventions : UUID v4 serveur, Instant ISO8601 UTC suffixe At, booleens is/has,
enums UPPER_SNAKE, Decimal jamais float, champs calcules jamais stockes.
Identifiants techniques en anglais, libelles affiches en francais.

Tables D1 a creer :
- users(id, email unique, firstName, lastName, neighborhood, city, lat, lng,
  dietaryPreferences JSON, avatarUrl, status ACTIVE|SUSPENDED, createdAt, updatedAt).
- tables(id, hostId -> users, dishName, description, startsAt indexe, durationMinutes defaut 120,
  seatsTotal hotes exclus, visibility PUBLIC|PRIVATE defaut PUBLIC,
  status OPEN|FULL|CANCELLED|PASSED, isVegetarian, hasAllergenNotice, createdAt
  + location embarquee : neighborhood, city, postalCode, latitude, longitude, addressLine).
- participations(id, tableId, userId, role HOST|GUEST, status
  CONFIRMED|CANCELLED|ATTENDED|NO_SHOW defaut CONFIRMED, joinedAt,
  UNIQUE(tableId,userId), INDEX(userId,status)).
- contributions(id, participationId UNIQUE, label, quantity Decimal nullable,
  unit KG|G|L|CL|UNIT|PORTION nullable, category
  APPETIZER|MAIN|DESSERT|DRINK|INGREDIENT|NONE, status PROPOSED|CONFIRMED|BROUGHT).
- messages(id, tableId indexe, authorId, type TEXT|AUDIO|SYSTEM,
  text obligatoire si TEXT, audioUrl obligatoire si AUDIO, durationSeconds, sentAt indexe desc).

Regles R1-R11 a coder cote Worker :
R1 creation tablee = participation HOST CONFIRMED dans la meme transaction.
R2 seatsAvailable calcule = seatsTotal - count(GUEST CONFIRMED), jamais stocke.
R3 rejoindre exige OPEN + seatsAvailable>=1 + startsAt futur sinon 409.
R4 unicite (tableId,userId) -> 409 ALREADY_PARTICIPATING.
R5 contribution rattachee a participation, 0..1.
R6 category NONE => quantity et unit nuls.
R7 adresse exacte reservee hote + confirmes ; autres = quartier + position arrondie 300m.
R8 messages reserves hote + confirmes, table OPEN|FULL ; CANCELLED|PASSED lecture seule.
R9 hote ne quitte pas (409 HOST_CANNOT_LEAVE), il annule -> participations CANCELLED.
R10 passe startsAt+durationMinutes -> PASSED, historique conserve.
R11 invites : ecriture limite a sa participation/contribution.

Titre derive a l'affichage : {dishName} chez {host.firstName}, jamais stocke.
status FULL derive de seatsAvailable=0. Filtres A venir/Passees calcules via status+startsAt.

### B4. Endpoints /api/v1 a implementer dans workers/src/routes/

Garder index.ts (CORS, health, me, 404/500) et ajouter :
- routes/auth.ts : POST /auth/magic-links (202, 422, 429),
  POST /auth/sessions (201, 401, 422). Token usage unique, 15 min.
- routes/me.ts : GET /me, PATCH /me (partiel, onboarding), GET /me/tables?scope.
- routes/tables.ts : GET /tables (filtres lat+lng obligatoires ensemble, radiusKm 0.5-50
  defaut 5, dietary repetable, vegetarianOnly, query min 2, sortBy distance|startsAt|
  seatsAvailable, pagination page/pageSize defaut 1/20 max 100),
  POST /tables (201, cree HOST CONFIRMED), GET /tables/{tableId} (adresse masquee si non participant).
- routes/participations.ts : POST /tables/{tableId}/participations (201, header Idempotency-Key
  UUID : rejouer = renvoyer la participation existante),
  DELETE /tables/{tableId}/participations/me (204). 409 TABLE_FULL|TABLE_CLOSED|
  TABLE_PASSED|ALREADY_PARTICIPATING|HOST_CANNOT_LEAVE.
- routes/messages.ts : GET /tables/{tableId}/messages (plus recent d'abord, reserve confirmes,
  403 FORBIDDEN si prive non participant), POST (201).

Vocabulaire a respecter : tablee=Table, hote=User avec Participation HOST,
participant=Participation, apport=Contribution, NONE=Je ne fais pas les courses,
quartier=Location.neighborhood, rating.count agregat lecture seule.

### B5. Front prod : mapping ecrans maquette

Bon retour -> POST magic-links. Onboarding vous etes/Prenom/Nom/adresse -> GET+PATCH /me.
Accueil A venir/Passees -> GET /me/tables. Explorer + filtres Ce soir/Vegetarien -> GET /tables.
Detail Gratin dauphinois chez Leonie -> GET /tables/{id}. Votre contribution + Que peux-tu
apporter -> POST participations. C'est confirme = 201. Messages + fil Gratin chez Leonie -> messages.
Creer une tablee -> POST /tables. Desinscription -> DELETE participations/me.

Hors perimetre (ne pas implementer, ajout additif futur sans rupture) :
avis/notes (Review), recettes (Recipe), favoris (Favorite), notifications push,
meteo, envoi photos/vocal (Media), gestion hote PATCH tables/contributions, moderation (Report).

### B6. Verification prod

1. Coller openapi.yaml dans editor.swagger.io (doc interactive) ou Redoc.
2. Ouvrir modele-donnees.mmd sur mermaid.live.
3. Executer parcours.http requetes 1-15 dans l'ordre (REST Client VS Code / JetBrains).
4. Smoke : 202 magic-links meme si email inconnu, 401 sans Bearer, 403 fil prive,
   404 tablee inconnue, 409 FULL/CLOSED/ALREADY/HOST_CANNOT_LEAVE, 422 champs fautifs.
5. Confidentialite : non participant = pas de addressLine, position arrondie 300m.
