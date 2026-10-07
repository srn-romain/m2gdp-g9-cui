# API — conventions /api/v1

Reference : `specs/openapi/openapi.yaml` (fait foi), parcours `specs/openapi/parcours.http` (req. 1-15).

- Base unique `/api/v1`. Evolutions par champs optionnels.
- Listes : `{data, pagination:{page,pageSize,totalItems,totalPages}}` (max pageSize 100).
- Erreurs : `{error:{code,message,details}}`.
- Codes : VALIDATION_ERROR, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, TABLE_FULL,
  TABLE_CLOSED, TABLE_PASSED, ALREADY_PARTICIPATING, HOST_CANNOT_LEAVE, RATE_LIMITED, INTERNAL_ERROR.
- Auth : `POST /auth/magic-links` -> 202 toujours (422, 429) ; `POST /auth/sessions` -> 201 (401, 422).
- Idempotency-Key (UUID) sur POST participations : rejouer = renvoyer l'existant.
- Confidentialite : `location.addressLine` exacte reservee hote + confirmes ;
  sinon quartier + position arrondie 300 m. Messages reserves hote + confirmes (OPEN|FULL).
