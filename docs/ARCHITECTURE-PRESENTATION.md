# Architecture & Stack — La Bonne Tablée

Présentation technique courte et visuelle. Objectif : expliquer simplement, sans
rien trahir de la technique, comment l'ensemble s'imbrique et fonctionne.

## L'idée en une image

On a **3 vitrines** qui partagent un seul **cerveau** (l'API) et un seul
**carnet de réservation** (la base de données) :

- le **site vitrine** = la devanture du restaurant (on découvre le concept)
- le **dossier de projet** = les coulisses (le rendu étudiant)
- **l'application** = la salle à manger (on réserve, on cuisine, on discute)

Tout est hébergé chez **Cloudflare**, et l'identité des utilisateurs est gérée par
**Supabase**.

## 1. Le schéma d'architecture global

```mermaid
flowchart TB
    subgraph USERS["🖥️ Utilisateurs (mobile / PC)"]
        U["Une personne du quartier"]
    end

    subgraph CLOUDFLARE["☁️ Cloudflare (hébergement + réseau)"]
        subgraph PAGES["Pages : les 3 sites statiques"]
            DEPOT["labonnetablee-depot.pages.dev<br/>📁 Dossier de projet"]
            VITRINE["labonnetablee-landing.pages.dev<br/>🏪 Site vitrine"]
            APP["labonnetablee.pages.dev<br/>🍽️ Application Vue 3"]
        end
        API["labonnetablee-api<br/>⚙️ Worker Hono<br/>l'API REST /api/v1"]
        D1[("D1<br/>🧾 base SQL : tables, users, messages")]
        R2[("R2<br/>📦 stockage : avatars, photos")]
    end

    subgraph SUPABASE["🔐 Supabase Auth"]
        AUTH["Identité + Magic Links<br/>émet et valide les jetons"]
    end

    U -->|"découvre le projet"| DEPOT
    U -->|"découvre le produit"| VITRINE
    U -->|"utilise l'app"| APP
    APP -->|"appels API /api/v1"| API
    APP -->|"connexion par lien magique"| AUTH
    API -->|"vérifie le jeton (jose + JWKS)"| AUTH
    API -->|"lit / écrit les données"| D1
    API -->|"stocke les photos"| R2
```

À retenir : le front ne parle **jamais** directement à la base. Il passe toujours par
l'API, qui est la seule à connaître les règles du métier.

## 2. La stack technique

| Couche | Outils | Rôle en une phrase |
|---|---|---|
| Interface | Vue 3, Vite, Tailwind CSS, shadcn-vue | l'application (SPA installable / PWA) |
| État & navigation | Pinia, vue-router | mémoriser la session et naviguer |
| Authentification | Supabase Auth | « qui est qui », sans mot de passe |
| API | Hono sur Cloudflare Workers | toutes les règles métier, base `/api/v1` |
| IA | Cloudflare Workers AI | enrichir une description, proposer des plats |
| Base de données | Cloudflare D1 (SQL) | tables, utilisateurs, messages, participations |
| Fichiers | Cloudflare R2 (compatible S3) | avatars et photos |
| Hébergement | Cloudflare Pages | les 3 sites publics |

## 3. Comment on se connecte (le lien magique)

```mermaid
sequenceDiagram
    autonumber
    participant U as Utilisateur
    participant APP as App Vue (Pages)
    participant SA as Supabase Auth
    participant API as Worker Hono
    participant DB as D1

    U->>APP: tape son e-mail
    APP->>SA: signInWithOtp(email)
    SA-->>U: envoie un e-mail avec un lien magique
    U->>APP: clique le lien (retour /auth/finish)
    APP->>SA: récupère la session
    SA-->>APP: access token (1 h) + refresh token
    APP->>API: GET /api/v1/me (Bearer token)
    API->>SA: vérifie le jeton via JWKS
    API->>DB: cherche le profil par e-mail
    DB-->>API: profil trouvé
    API-->>APP: { data: profil }
    APP-->>U: « Bonjour ! »
```

Le rafraîchissement est automatique : tant que Supabase accepte le refresh token,
l'utilisateur reste connecté sans repasser par un e-mail.

## 4. Comment on crée une tablée (le cœur du métier)

```mermaid
sequenceDiagram
    autonumber
    participant U as Hôte
    participant APP as App Vue
    participant API as Worker Hono
    participant DB as D1
    participant R2 as R2

    U->>APP: remplit la fiche (recette, date, places)
    APP->>API: POST /api/v1/tables (Bearer)
    API->>API: applique les règles R1–R11
    API->>DB: crée la table + la participation HOST (même transaction)
    DB-->>API: table créée
    API-->>APP: { data: table }
    APP->>API: envoie la photo du plat
    API->>R2: stocke le fichier
    R2-->>API: URL de l'image
    API-->>APP: photo enregistrée
    APP-->>U: « Ta tablée est en ligne ! »
```

Les règles importantes (places calculées, hôte impossible à expulser, adresse masquée,
etc.) sont toutes appliquées **côté API**, jamais côté navigateur : c'est ce qui rend
l'application fiable.

## 5. Mini-lexique ludique

- **Cloudflare Pages** : le serveur qui « sert les plats » (les fichiers) aux visiteurs.
- **Cloudflare Workers** : le serveur qui « cuisine » (l'API), sans machine à gérer.
- **D1** : le carnet de réservation (base SQL) — tout est noté, rien n'est perdu.
- **R2** : le placard à photos (stockage de fichiers).
- **Supabase Auth** : le portier qui vérifie l'identité sans demander de mot de passe.
- **Magic link** : le ticket d'entrée envoyé par e-mail, valable 15 minutes.
