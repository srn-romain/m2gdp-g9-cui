-- Réduit le jeu synthétique à 500 tablées (IDs 1..500) pour une répartition
-- homogène sur Lyon et les communes voisines. Idempotent : supprime les
-- tablées 501..1000 et leurs données liées, sans toucher aux 12 utilisateurs.
-- À appliquer après les fichiers synthetique*.sql :
--   npx wrangler d1 execute labonnetablee-db --remote --file=seed/reduce-500.sql

DELETE FROM messages WHERE tableId IN (
  SELECT id FROM tables WHERE id > '5eede100-0000-4000-8000-000000000500'
    AND hostId IN (SELECT id FROM users WHERE email LIKE 'synt.%@labonnetablee.test')
);

DELETE FROM contributions WHERE participationId IN (
  SELECT p.id FROM participations p WHERE p.tableId IN (
    SELECT id FROM tables WHERE id > '5eede100-0000-4000-8000-000000000500'
      AND hostId IN (SELECT id FROM users WHERE email LIKE 'synt.%@labonnetablee.test')
  )
);

DELETE FROM idempotency_keys WHERE participationId IN (
  SELECT p.id FROM participations p WHERE p.tableId IN (
    SELECT id FROM tables WHERE id > '5eede100-0000-4000-8000-000000000500'
      AND hostId IN (SELECT id FROM users WHERE email LIKE 'synt.%@labonnetablee.test')
  )
);

DELETE FROM participations WHERE tableId IN (
  SELECT id FROM tables WHERE id > '5eede100-0000-4000-8000-000000000500'
    AND hostId IN (SELECT id FROM users WHERE email LIKE 'synt.%@labonnetablee.test')
);

DELETE FROM tables WHERE id > '5eede100-0000-4000-8000-000000000500'
  AND hostId IN (SELECT id FROM users WHERE email LIKE 'synt.%@labonnetablee.test');
