-- Permet plusieurs apports (0..N) par participation : retire la contrainte UNIQUE
-- sur contributions.participationId. R5 passe de 0..1 à 0..N.
CREATE TABLE contributions_new (
  id TEXT PRIMARY KEY,
  participationId TEXT NOT NULL REFERENCES participations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  quantity TEXT,
  unit TEXT CHECK (unit IS NULL OR unit IN ('KG','G','L','CL','UNIT','PORTION')),
  category TEXT NOT NULL CHECK (category IN ('APPETIZER','MAIN','DESSERT','DRINK','INGREDIENT','NONE')),
  status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','CONFIRMED','BROUGHT'))
);

INSERT INTO contributions_new (id, participationId, label, quantity, unit, category, status)
  SELECT id, participationId, label, quantity, unit, category, status FROM contributions;

DROP TABLE contributions;
ALTER TABLE contributions_new RENAME TO contributions;
