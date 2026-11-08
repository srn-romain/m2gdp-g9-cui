# Modèle de données UML — scénario minimal

Source : parcours client de la maquette « La Bonne Tablée ». Périmètre : le scénario décrit
dans [../README.md](../README.md), points 1 à 7.

## Conventions

| Élément | Convention |
|---|---|
| Identifiants | `camelCase`, en anglais (voir la table de vocabulaire dans le README) |
| Clés primaires | `UUID` version 4, générées côté serveur |
| Horodatages | `Instant`, ISO 8601 en UTC, suffixe `At` (`createdAt`, `startsAt`) |
| Booléens | préfixe `is` ou `has` (`isVegetarian`, `hasAllergenNotice`) |
| Énumérations | valeurs en `UPPER_SNAKE` (`CONFIRMED`, `SANS_PORC` n'existe pas, on écrit `NO_PORK`) |
| Argent, quantités | `Decimal`, jamais de flottant |
| Champs calculés | jamais stockés, marqués « dérivé » dans le dictionnaire |

## Diagramme de classes

```mermaid
classDiagram
    direction LR

    class User {
        +UUID id
        +String email
        +String firstName
        +String lastName
        +String neighborhood
        +String city
        +Coordinates coordinates
        +List~DietaryPreference~ dietaryPreferences
        +String avatarUrl
        +AccountStatus status
        +Instant createdAt
        +Instant updatedAt
    }

    class Table {
        +UUID id
        +UUID hostId
        +String dishName
        +String description
        +Instant startsAt
        +int durationMinutes
        +int seatsTotal
        +int seatsAvailable
        +Visibility visibility
        +TableStatus status
        +boolean isVegetarian
        +boolean hasAllergenNotice
        +Location location
        +List~WantedContribution~ wantedContributions
        +Instant createdAt
    }

    class Location {
        <<ValueObject>>
        +String neighborhood
        +String city
        +String postalCode
        +double latitude
        +double longitude
        +String addressLine
    }

    class Participation {
        +UUID id
        +UUID tableId
        +UUID userId
        +ParticipationRole role
        +ParticipationStatus status
        +Instant joinedAt
    }

    class Contribution {
        +UUID id
        +UUID participationId
        +String label
        +Decimal quantity
        +QuantityUnit unit
        +ContributionCategory category
        +ContributionStatus status
    }

    class WantedContribution {
        <<ValueObject>>
        +String label
        +Decimal quantity
        +QuantityUnit unit
    }

    class Message {
        +UUID id
        +UUID tableId
        +UUID authorId
        +MessageType type
        +String text
        +String audioUrl
        +String imageUrl
        +int durationSeconds
        +Instant sentAt
    }

    User "1" --> "0..*" Table : héberge
    User "1" --> "0..*" Participation : participe
    Table "1" *-- "1..*" Participation : rassemble
    Participation "1" *-- "0..1" Contribution : déclare
    Table "1" *-- "0..*" WantedContribution : propose
    Table "1" *-- "0..*" Message : contient
    User "1" --> "0..*" Message : écrit
    Table "1" --> "1" Location : se tient à
```

Lecture des relations :

- `Table *-- Participation` est une **composition** : une participation n'existe pas sans sa
  tablée, et une tablée porte toujours au moins une participation, celle de son hôte.
- `Participation *-- Contribution` est une composition avec multiplicité `0..1` : un
  participant peut ne rien apporter (« Je ne fais pas les courses »), il ne peut pas
  apporter deux choses distinctes dans le scénario minimal.
- `Table *-- WantedContribution` est une **composition** d'objets-valeurs : la liste de
  courses proposée par l'hôte (« Courgettes 4 », « Riz arborio 500 g »). Elle n'est
  rattachée à aucune participation — c'est une suggestion que les invités s'approprient
  en rejoignant, à la différence d'une `Contribution` (cf. R5 et R12).
- `Location` est un **objet-valeur** embarqué, pas une entité : il n'a pas d'identité propre
  et se modifie avec la tablée.

## Dictionnaire de données

### User

| Champ | Type | Contraintes | Description |
|---|---|---|---|
| `id` | UUID | clé primaire | |
| `email` | String(254) | unique, non nul, format RFC 5322 | Identifiant de connexion, sert au lien magique |
| `firstName` | String(80) | non nul | « Bernard » |
| `lastName` | String(80) | non nul | « Martin » |
| `neighborhood` | String(80) | non nul | « Lyon 7e », sert au calcul des distances |
| `city` | String(80) | non nul | « Lyon » |
| `coordinates` | Coordinates | nullable | Latitude et longitude du quartier. Renseignées dès que l'adresse est connue (autocomplétion d'adresse) |
| `dietaryPreferences` | DietaryPreference[] | non nul, défaut `[]` | « Végétarien », « Sans porc » |
| `avatarUrl` | String(2048) | nullable | |
| `status` | AccountStatus | non nul, défaut `ACTIVE` | |
| `createdAt` | Instant | non nul | |
| `updatedAt` | Instant | non nul | |

### Table

| Champ | Type | Contraintes | Description |
|---|---|---|---|
| `id` | UUID | clé primaire | |
| `hostId` | UUID | clé étrangère vers `User.id`, non nul | |
| `dishName` | String(120) | non nul | « Gratin dauphinois ». Le titre affiché en est dérivé |
| `description` | String(600) | nullable | « Un gratin maison à partager entre voisins. » |
| `startsAt` | Instant | non nul, indexé | « Aujourd'hui · 12 h 30 » |
| `durationMinutes` | int | non nul, `> 0`, défaut 120 | Sert à basculer la tablée en `PASSED` |
| `seatsTotal` | int | non nul, `>= 1` | Places ouvertes aux invités, **hôte exclu** |
| `seatsAvailable` | int | **dérivé**, `>= 0` | `seatsTotal` moins les participations confirmées hors hôte |
| `visibility` | Visibility | non nul, défaut `PUBLIC` | |
| `status` | TableStatus | non nul, défaut `OPEN` | |
| `isVegetarian` | boolean | non nul, défaut `false` | Affiche l'étiquette « Végétarien » |
| `hasAllergenNotice` | boolean | non nul, défaut `false` | Affiche « Allergènes indiqués » |
| `location` | Location | non nul, embarqué | |
| `wantedContributions` | WantedContribution[] | non nul, défaut `[]`, max 20 | Liste de courses proposée par l'hôte. Filtre « régime » : `isVegetarian` |
| `createdAt` | Instant | non nul | |

### Location, objet-valeur embarqué dans Table

| Champ | Type | Contraintes | Description |
|---|---|---|---|
| `neighborhood` | String(80) | non nul | « Lyon 7e » |
| `city` | String(80) | non nul | « Lyon » |
| `postalCode` | String(10) | nullable | |
| `latitude` | double | non nul, `-90` à `90` | Position approximative communiquée aux non-participants |
| `longitude` | double | non nul, `-180` à `180` | |
| `addressLine` | String(200) | nullable | Adresse exacte, renseignée uniquement pour les participants confirmés |

### Participation

| Champ | Type | Contraintes | Description |
|---|---|---|---|
| `id` | UUID | clé primaire | |
| `tableId` | UUID | clé étrangère vers `Table.id`, non nul | |
| `userId` | UUID | clé étrangère vers `User.id`, non nul | |
| `role` | ParticipationRole | non nul | `HOST` ou `GUEST` |
| `status` | ParticipationStatus | non nul, défaut `CONFIRMED` | Voir le diagramme d'états |
| `joinedAt` | Instant | non nul | Affiche « il y a 2 jours » |

Contrainte d'unicité : `(tableId, userId)`. Index : `(userId, status)` pour l'écran « Mes
tablées ».

### Contribution

| Champ | Type | Contraintes | Description |
|---|---|---|---|
| `id` | UUID | clé primaire | |
| `participationId` | UUID | clé étrangère vers `Participation.id`, **unique**, non nul | Une contribution au plus par participation |
| `label` | String(120) | non nul | « Pommes de terre », « salade », « pain » |
| `quantity` | Decimal | nullable | Nul si `category = NONE` |
| `unit` | QuantityUnit | nullable | `KG`, `G`, `L`, `CL`, `UNIT`, `PORTION` |
| `category` | ContributionCategory | non nul | `APPETIZER`, `MAIN`, `DESSERT`, `DRINK`, `INGREDIENT`, `NONE` |
| `status` | ContributionStatus | non nul, défaut `PROPOSED` | |

### WantedContribution, objet-valeur embarqué dans Table

Ingrédient que l'hôte propose d'apporter. Objet-valeur sans identité : il vit et meurt
avec sa tablée, et n'est rattaché à aucune participation.

| Champ | Type | Contraintes | Description |
|---|---|---|---|
| `label` | String(120) | non nul | « Courgettes », « Riz arborio » |
| `quantity` | Decimal | nullable, `> 0` | Nul si la quantité n'est pas précisée |
| `unit` | QuantityUnit | nullable | `KG`, `G`, `L`, `CL`, `UNIT`, `PORTION` |

### Message

| Champ | Type | Contraintes | Description |
|---|---|---|---|
| `id` | UUID | clé primaire | |
| `tableId` | UUID | clé étrangère vers `Table.id`, non nul, indexé | |
| `authorId` | UUID | clé étrangère vers `User.id`, non nul | |
| `type` | MessageType | non nul | `TEXT`, `AUDIO`, `IMAGE`, `SYSTEM` |
| `text` | String(2000) | nullable | Obligatoire si `type = TEXT` |
| `audioUrl` | String(2048) | nullable | Obligatoire si `type = AUDIO` |
| `imageUrl` | String(2048) | nullable | Obligatoire si `type = IMAGE` |
| `durationSeconds` | int | nullable | Renseigné si `type = AUDIO` |
| `sentAt` | Instant | non nul, indexé en ordre décroissant | Tri du fil |

## Énumérations

| Énumération | Valeurs | Remarque |
|---|---|---|
| `AccountStatus` | `ACTIVE`, `SUSPENDED` | |
| `DietaryPreference` | `VEGETARIAN`, `VEGAN`, `NO_PORK`, `NO_GLUTEN`, `NO_LACTOSE`, `HALAL`, `KOSHER`, `NO_NUTS` | Extensible par ajout |
| `Visibility` | `PUBLIC`, `PRIVATE` | `PRIVATE` = accessible seulement aux invités de l'hôte |
| `TableStatus` | `OPEN`, `FULL`, `CANCELLED`, `PASSED` | `FULL` est dérivé de `seatsAvailable = 0` |
| `ParticipationRole` | `HOST`, `GUEST` | |
| `ParticipationStatus` | `CONFIRMED`, `CANCELLED`, `ATTENDED`, `NO_SHOW` | `PENDING` réservé pour une future validation par l'hôte |
| `ContributionCategory` | `APPETIZER`, `MAIN`, `DESSERT`, `DRINK`, `INGREDIENT`, `NONE` | `NONE` = « Je ne fais pas les courses » |
| `ContributionStatus` | `PROPOSED`, `CONFIRMED`, `BROUGHT` | |
| `MessageType` | `TEXT`, `AUDIO`, `IMAGE`, `SYSTEM` | `SYSTEM` pour « Bernard a rejoint la tablée », `IMAGE` pour une photo partagée |

## Règles métier et invariants

| # | Règle |
|---|---|
| R1 | À la création d'une tablée, l'hôte devient participant avec `role = HOST` et `status = CONFIRMED`. Une tablée a donc toujours au moins une participation. |
| R2 | `seatsAvailable = seatsTotal - count(Participation où role = GUEST et status = CONFIRMED)`. Jamais stocké, jamais écrit à la main. |
| R3 | Rejoindre une tablée exige `status = OPEN`, `seatsAvailable >= 1` et `startsAt` dans le futur. Sinon `409 TABLE_FULL` ou `409 TABLE_CLOSED`. |
| R4 | Un utilisateur ne peut avoir qu'une participation par tablée. Un second appel renvoie `409 ALREADY_PARTICIPATING`. |
| R5 | Une contribution appartient à une participation, jamais directement à un utilisateur. |
| R6 | `category = NONE` implique `quantity` et `unit` nuls. |
| R7 | L'adresse exacte (`location.addressLine`) n'est renvoyée qu'à l'hôte et aux participants confirmés. Les autres reçoivent le quartier et une position arrondie à 300 mètres près, ce qui produit « Lyon 7e · 700 m ». |
| R8 | Un message ne peut être créé que par l'hôte ou un participant confirmé, et seulement si la tablée est `OPEN` ou `FULL`. Les tablées `CANCELLED` et `PASSED` restent en lecture seule. |
| R9 | L'hôte ne peut pas quitter sa propre tablée (`409 HOST_CANNOT_LEAVE`) : il doit l'annuler, ce qui bascule toutes les participations en `CANCELLED`. |
| R10 | Passé `startsAt + durationMinutes`, la tablée devient `PASSED`. Aucune donnée n'est supprimée physiquement : l'historique « Passées » et les fils de discussion restent consultables. |
| R11 | L'hôte peut annuler sa tablée. Un invité ne peut modifier que sa propre contribution et sa propre participation. |
| R12 | `Table.wantedContributions` est une liste de courses indicative : elle n'est rattachée à aucune participation et n'engage personne. Ce qui est réellement apporté reste une `Contribution` liée à une `Participation` (cf. R5) et alimente « Ce que chacun apporte ». |
| R13 | Les médias (photo de profil, image de message, message vocal) sont stockés dans R2 sous une clé imprévisible et servis par l'API : `avatarUrl`, `imageUrl` et `audioUrl` pointent vers `GET /avatar?key=…`. L'écriture n'est permise que sous `avatars/{userId}/` ou `messages/{userId}/`. |
| R14 | `GET /tables` accepte `lat`/`lng` : sans point de départ connu, aucun filtre de rayon ni tri par distance ne s'applique (repli sur le tri par date). |

## Diagrammes d'états

```mermaid
stateDiagram-v2
    [*] --> CONFIRMED : inscription immédiate
    CONFIRMED --> CANCELLED : désinscription ou annulation de la tablée
    CONFIRMED --> ATTENDED : tablée passée, présence constatée
    CONFIRMED --> NO_SHOW : tablée passée, absence constatée
    ATTENDED --> [*]
    NO_SHOW --> [*]
    CANCELLED --> [*]
```

```mermaid
stateDiagram-v2
    [*] --> OPEN : création par l'hôte
    OPEN --> FULL : seatsAvailable = 0
    FULL --> OPEN : désinscription d'un invité
    OPEN --> CANCELLED : annulation par l'hôte
    FULL --> CANCELLED : annulation par l'hôte
    OPEN --> PASSED : startsAt + durationMinutes dépassé
    FULL --> PASSED : startsAt + durationMinutes dépassé
    CANCELLED --> [*]
    PASSED --> [*]
```

## Extensions prévues

Chacune s'ajoute sans modifier les entités existantes.

| Entité | Se rattache à | Cardinalité | Effet sur l'existant |
|---|---|---|---|
| `Review` | `Participation` | `1 Participation 0..1 Review` | Aucun. Alimente l'agrégat `User.rating` déjà exposé en lecture seule |
| `Recipe` | `User` (auteur) | `1 User 0..* Recipe` | Aucun. Nouvelle ressource `/recipes` |
| `Favorite` | `User` et `Table` | `1 User 0..* Favorite`, `1 Table 0..* Favorite` | Aucun. Nouvelle ressource `/me/favorites` |
| `Notification` | `User` | `1 User 0..* Notification` | Aucun. Nouveau canal, hors API REST si le push suffit |
| `Media` | `User` | `1 User 0..* Media` | Aucun. `Message.audioUrl` pointera vers `Media.url` au lieu d'une URL externe |

## Workers AI (hors modèle persistant)

L'assistant IA (binding `AI`, modèle `@cf/meta/llama-3.2-3b-instruct`) n'ajoute
aucune entité ni aucune table : il est **sans état**. Les endpoints
`POST /ai/table-draft` et `POST /ai/table-suggestions` génèrent des données
éphémères (brouillon, suggestions) qui ne sont persistées qu'après validation
explicite par l'utilisateur via les endpoints métier existants. Le diagramme de
classes ci-dessus reste donc inchangé.
