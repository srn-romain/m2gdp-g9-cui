# GUIDE-LOCAL

```sh
# Emulateurs Firebase (Auth 9099, Firestore 8081, RTDB 9000, Hosting 5001)
firebase emulators:start
# Front (http://localhost:5173)
cd public && npm install && npm run dev
# Worker (http://localhost:8787, base /api/v1)
cd workers && npm install && npx wrangler dev --port 8787
# Parcours metier : specs/openapi/parcours.http (baseUrl http://localhost:8080/api/v1 -> adapter vers 8787)
```

Front : `VITE_API_URL=http://localhost:8787`, `VITE_USE_FIREBASE_EMULATORS=false` par defaut
(`.env.example`). Mobile LAN : le front remplace localhost par le hostname courant.
