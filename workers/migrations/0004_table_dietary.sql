-- La Bonne Tablee — régimes alimentaires des tablées (multi-sélection).
-- `dietaryTags` devient la source de vérité ; `isVegetarian` est conservé et
-- synchronisé pour rester compatible avec l'existant.
ALTER TABLE tables ADD COLUMN dietaryTags TEXT NOT NULL DEFAULT '[]';

-- Reprise des tablées déjà créées : un plat végétarien correspond au régime VEGETARIAN.
UPDATE tables SET dietaryTags = '["VEGETARIAN"]' WHERE isVegetarian = 1 AND dietaryTags = '[]';
