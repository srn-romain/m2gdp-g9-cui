-- Ingrédients proposés par l'hôte : liste JSON, jamais requêtée en SQL.
-- Une `Contribution` reste rattachée à une participation (R5) ; cette liste-ci
-- n'affecte personne, c'est une liste de courses indicative.
ALTER TABLE tables ADD COLUMN wantedContributions TEXT NOT NULL DEFAULT '[]';
