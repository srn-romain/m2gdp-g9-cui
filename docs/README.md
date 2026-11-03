# docs — La Bonne Tablee (prod)

Source de verite metier : `specs/` (README, uml/modele-donnees, openapi/openapi.yaml,
openapi/parcours.http). Ce dossier ne duplique pas le metier.

Ecart documente (POC vs scenNominal) : la reference metier vit en `specs/`, pas en
`docs/scenNominal`. Pour respecter le nom attendu sans dupliquer, voir
`docs/scenNominal/README.md` (pointeur, aucune regle metier ici).

- `docs/agents.md` : copie du cadrage racine `agents.md`.
- `docs/ARCHITECTURE.md` : resume d'implementation prod (Supabase Auth + Cloudflare Pages).
- `docs/API.md` : conventions d'API /api/v1.
- `docs/DEPLOYMENT.md` : deploiement hosting + worker.
- `docs/SUPABASE-DEPLOYMENT.md` : deploiement de la migration Firebase → Supabase.
- `docs/GUIDE-LOCAL.md` : demarrage local.
