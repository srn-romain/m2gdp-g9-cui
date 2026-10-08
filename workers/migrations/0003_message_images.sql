-- Une photo peut être partagée dans le fil de discussion. La contrainte CHECK sur
-- `type` impose de reconstruire la table pour accueillir la valeur 'IMAGE'.
CREATE TABLE messages_new (
  id TEXT PRIMARY KEY,
  tableId TEXT NOT NULL REFERENCES tables(id),
  authorId TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('TEXT','AUDIO','IMAGE','SYSTEM')),
  text TEXT,
  audioUrl TEXT,
  imageUrl TEXT,
  durationSeconds INTEGER,
  sentAt TEXT NOT NULL
);

INSERT INTO messages_new (id, tableId, authorId, type, text, audioUrl, imageUrl, durationSeconds, sentAt)
  SELECT id, tableId, authorId, type, text, audioUrl, NULL, durationSeconds, sentAt FROM messages;

DROP TABLE messages;
ALTER TABLE messages_new RENAME TO messages;
CREATE INDEX IF NOT EXISTS idx_messages_table_sentAt ON messages(tableId, sentAt DESC);
