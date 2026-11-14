# API — conventions /api/v1

Reference : `specs/openapi/openapi.yaml` (fait foi), parcours `specs/openapi/parcours.http` (req. 1-15).

- Base unique `/api/v1`. Evolutions par champs optionnels.
- Listes : `{data, pagination:{page,pageSize,totalItems,totalPages}}` (max pageSize 100).
- Erreurs : `{error:{code,message,details}}`.
- Codes : VALIDATION_ERROR, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, TABLE_FULL,
  TABLE_CLOSED, TABLE_PASSED, ALREADY_PARTICIPATING, HOST_CANNOT_LEAVE, RATE_LIMITED, INTERNAL_ERROR.
- Auth : Supabase OTP (code à 6 chiffres par e-mail, SMTP Gmail) ; `POST /auth/magic-links` -> 202 toujours (422, 429) ; `POST /auth/sessions` -> 201 (401, 422).
- Participations : `POST` et `PATCH /tables/:tableId/contributions/me` acceptent `{contributions: [...]}` (`0..N`, max 20) ; `NONE` sans quantité/unité.
- Idempotency-Key (UUID) sur POST participations : rejouer = renvoyer l'existant.
- Confidentialite : `location.addressLine` exacte reservee hote + confirmes ;
  sinon quartier + position arrondie 300 m. Messages reserves hote + confirmes (OPEN|FULL).
- IA : `POST /ai/table-draft` (description + `ambianceHint` optionnel -> `dishName`, `description`, `ambiance` ≤ 300 caractères, `moteur`, `dishImageUrl`, `wantedContributions`, `seatsTotal`, `durationMinutes`) via Gemini puis Workers AI, repli local ; `POST /ai/table-suggestions` (plats existants uniquement, repli lexical). Explorateur : autocomplétion et repli 100 % base locale, sans IA.
