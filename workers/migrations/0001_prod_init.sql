-- La Bonne Tablee prod — D1 init (conventions UML : UUID v4 serveur, Instant ISO8601 UTC TEXT,
-- enums UPPER_SNAKE, Decimal en TEXT jamais float, champs calcules jamais stockes).
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  firstName TEXT NOT NULL DEFAULT '',
  lastName TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  lat REAL,
  lng REAL,
  dietaryPreferences TEXT NOT NULL DEFAULT '[]',
  avatarUrl TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  hostId TEXT NOT NULL REFERENCES users(id),
  dishName TEXT NOT NULL,
  description TEXT,
  startsAt TEXT NOT NULL,
  durationMinutes INTEGER NOT NULL DEFAULT 120 CHECK (durationMinutes > 0),
  seatsTotal INTEGER NOT NULL CHECK (seatsTotal >= 1),
  visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC','PRIVATE')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','FULL','CANCELLED','PASSED')),
  isVegetarian INTEGER NOT NULL DEFAULT 0,
  hasAllergenNotice INTEGER NOT NULL DEFAULT 0,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  postalCode TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  addressLine TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tables_startsAt ON tables(startsAt);
CREATE INDEX IF NOT EXISTS idx_tables_status_startsAt ON tables(status, startsAt);

CREATE TABLE IF NOT EXISTS participations (
  id TEXT PRIMARY KEY,
  tableId TEXT NOT NULL REFERENCES tables(id),
  userId TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('HOST','GUEST')),
  status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED','CANCELLED','ATTENDED','NO_SHOW')),
  joinedAt TEXT NOT NULL,
  UNIQUE (tableId, userId)
);
CREATE INDEX IF NOT EXISTS idx_participations_user_status ON participations(userId, status);
CREATE INDEX IF NOT EXISTS idx_participations_table ON participations(tableId);

CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  participationId TEXT NOT NULL UNIQUE REFERENCES participations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  quantity TEXT,
  unit TEXT CHECK (unit IS NULL OR unit IN ('KG','G','L','CL','UNIT','PORTION')),
  category TEXT NOT NULL CHECK (category IN ('APPETIZER','MAIN','DESSERT','DRINK','INGREDIENT','NONE')),
  status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','CONFIRMED','BROUGHT'))
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  tableId TEXT NOT NULL REFERENCES tables(id),
  authorId TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('TEXT','AUDIO','SYSTEM')),
  text TEXT,
  audioUrl TEXT,
  durationSeconds INTEGER,
  sentAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_table_sentAt ON messages(tableId, sentAt DESC);

-- Auth : liens magiques usage unique 15 min + sessions opaques 1h (parcours.http / tests).
CREATE TABLE IF NOT EXISTS magic_links (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  usedAt TEXT,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  revokedAt TEXT,
  ip TEXT,
  ua TEXT
);

-- Idempotence POST participations (Idempotency-Key UUID -> participation existante).
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  tableId TEXT NOT NULL,
  participationId TEXT NOT NULL REFERENCES participations(id),
  createdAt TEXT NOT NULL
);
