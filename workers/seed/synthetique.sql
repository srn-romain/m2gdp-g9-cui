-- Jeu de données synthétique complémentaire : 12 utilisateurs, 8 tablées,
-- participations, apports, ingrédients et messages.
-- Idempotent : purge les lignes `synt.%@labonnetablee.test` avant insertion.
-- Application : npx wrangler d1 execute labonnetablee-db --local --file=seed/synthetique.sql

DELETE FROM messages
 WHERE tableId IN (SELECT id FROM tables WHERE hostId IN (SELECT id FROM users WHERE email LIKE 'synt.%@labonnetablee.test'));
DELETE FROM contributions
 WHERE participationId IN (
   SELECT p.id FROM participations p
   WHERE p.tableId IN (SELECT id FROM tables WHERE hostId IN (SELECT id FROM users WHERE email LIKE 'synt.%@labonnetablee.test'))
      OR p.userId IN (SELECT id FROM users WHERE email LIKE 'synt.%@labonnetablee.test')
 );
DELETE FROM participations
 WHERE tableId IN (SELECT id FROM tables WHERE hostId IN (SELECT id FROM users WHERE email LIKE 'synt.%@labonnetablee.test'))
    OR userId IN (SELECT id FROM users WHERE email LIKE 'synt.%@labonnetablee.test');
DELETE FROM tables WHERE hostId IN (SELECT id FROM users WHERE email LIKE 'synt.%@labonnetablee.test');
DELETE FROM users WHERE email LIKE 'synt.%@labonnetablee.test';

INSERT INTO users (id,email,firstName,lastName,neighborhood,city,lat,lng,dietaryPreferences,avatarUrl,status,createdAt,updatedAt) VALUES
('5eede001-0000-4000-8000-000000000001','synt.alice@labonnetablee.test','Alice','Martin','Lyon 3e','Lyon',45.758,4.850,'["VEGETARIAN"]',NULL,'ACTIVE',strftime('%Y-%m-%dT%H:%M:%SZ','now','-30 days'),strftime('%Y-%m-%dT%H:%M:%SZ','now')),
('5eede001-0000-4000-8000-000000000002','synt.karim@labonnetablee.test','Karim','Benali','Lyon 7e','Lyon',45.741,4.834,'[]',NULL,'ACTIVE',strftime('%Y-%m-%dT%H:%M:%SZ','now','-28 days'),strftime('%Y-%m-%dT%H:%M:%SZ','now')),
('5eede001-0000-4000-8000-000000000003','synt.lea@labonnetablee.test','Lea','Nguyen','Villeurbanne','Villeurbanne',45.771,4.890,'["NO_GLUTEN"]',NULL,'ACTIVE',strftime('%Y-%m-%dT%H:%M:%SZ','now','-26 days'),strftime('%Y-%m-%dT%H:%M:%SZ','now')),
('5eede001-0000-4000-8000-000000000004','synt.thomas@labonnetablee.test','Thomas','Petit','Lyon 1er','Lyon',45.772,4.837,'[]',NULL,'ACTIVE',strftime('%Y-%m-%dT%H:%M:%SZ','now','-24 days'),strftime('%Y-%m-%dT%H:%M:%SZ','now')),
('5eede001-0000-4000-8000-000000000005','synt.sofia@labonnetablee.test','Sofia','Rossi','Lyon 5e','Lyon',45.760,4.823,'["NO_NUTS"]',NULL,'ACTIVE',strftime('%Y-%m-%dT%H:%M:%SZ','now','-22 days'),strftime('%Y-%m-%dT%H:%M:%SZ','now')),
('5eede001-0000-4000-8000-000000000006','synt.hugo@labonnetablee.test','Hugo','Moreau','Lyon 8e','Lyon',45.735,4.865,'[]',NULL,'ACTIVE',strftime('%Y-%m-%dT%H:%M:%SZ','now','-20 days'),strftime('%Y-%m-%dT%H:%M:%SZ','now')),
('5eede001-0000-4000-8000-000000000007','synt.emma@labonnetablee.test','Emma','Diallo','Lyon 2e','Lyon',45.754,4.823,'["VEGAN"]',NULL,'ACTIVE',strftime('%Y-%m-%dT%H:%M:%SZ','now','-18 days'),strftime('%Y-%m-%dT%H:%M:%SZ','now')),
('5eede001-0000-4000-8000-000000000008','synt.paul@labonnetablee.test','Paul','Fontaine','Lyon 4e','Lyon',45.781,4.826,'[]',NULL,'ACTIVE',strftime('%Y-%m-%dT%H:%M:%SZ','now','-16 days'),strftime('%Y-%m-%dT%H:%M:%SZ','now')),
('5eede001-0000-4000-8000-000000000009','synt.ines@labonnetablee.test','Ines','Mercier','Lyon 6e','Lyon',45.769,4.851,'["NO_PORK"]',NULL,'ACTIVE',strftime('%Y-%m-%dT%H:%M:%SZ','now','-14 days'),strftime('%Y-%m-%dT%H:%M:%SZ','now')),
('5eede001-0000-4000-8000-000000000010','synt.yanis@labonnetablee.test','Yanis','Traore','Lyon 9e','Lyon',45.786,4.803,'[]',NULL,'ACTIVE',strftime('%Y-%m-%dT%H:%M:%SZ','now','-12 days'),strftime('%Y-%m-%dT%H:%M:%SZ','now')),
('5eede001-0000-4000-8000-000000000011','synt.chloe@labonnetablee.test','Chloe','Barbier','Lyon 7e','Lyon',45.731,4.853,'["NO_LACTOSE"]',NULL,'ACTIVE',strftime('%Y-%m-%dT%H:%M:%SZ','now','-10 days'),strftime('%Y-%m-%dT%H:%M:%SZ','now')),
('5eede001-0000-4000-8000-000000000012','synt.adam@labonnetablee.test','Adam','Kowalski','Villeurbanne','Villeurbanne',45.768,4.892,'[]',NULL,'ACTIVE',strftime('%Y-%m-%dT%H:%M:%SZ','now','-8 days'),strftime('%Y-%m-%dT%H:%M:%SZ','now'));

INSERT INTO tables (id,hostId,dishName,description,startsAt,durationMinutes,seatsTotal,visibility,status,isVegetarian,hasAllergenNotice,neighborhood,city,postalCode,latitude,longitude,addressLine,createdAt,wantedContributions) VALUES
('5eede100-0000-4000-8000-000000000001','5eede001-0000-4000-8000-000000000001','Courge rôtie et châtaignes','Plat végétarien de saison.',date('now','+2 days')||'T18:30:00Z',120,4,'PUBLIC','OPEN',1,0,'Lyon 3e','Lyon','69003',45.758,4.850,NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-5 days'),'[{"label":"Courge","quantity":1,"unit":"UNIT"},{"label":"Châtaignes","quantity":300,"unit":"G"}]'),
('5eede100-0000-4000-8000-000000000002','5eede001-0000-4000-8000-000000000002','Tajine de légumes','Tajine doux aux pruneaux.',date('now','+4 days')||'T19:00:00Z',120,5,'PUBLIC','OPEN',1,1,'Lyon 7e','Lyon','69007',45.741,4.834,NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-4 days'),'[{"label":"Carottes","quantity":400,"unit":"G"},{"label":"Pruneaux","quantity":200,"unit":"G"}]'),
('5eede100-0000-4000-8000-000000000003','5eede001-0000-4000-8000-000000000003','Ramen maison','Bouillon végétarien, œuf mariné.',date('now','+6 days')||'T18:30:00Z',120,6,'PUBLIC','OPEN',0,0,'Villeurbanne','Villeurbanne','69100',45.771,4.890,NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-3 days'),'[{"label":"Nouilles","quantity":400,"unit":"G"},{"label":"Œufs","quantity":4,"unit":"UNIT"}]'),
('5eede100-0000-4000-8000-000000000004','5eede001-0000-4000-8000-000000000004','Pissaladière','Tarte fine aux oignons et anchois.',date('now','+8 days')||'T12:30:00Z',120,4,'PUBLIC','OPEN',0,0,'Lyon 1er','Lyon','69001',45.772,4.837,NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-2 days'),'[{"label":"Oignons","quantity":1,"unit":"KG"},{"label":"Anchois","quantity":150,"unit":"G"}]'),
('5eede100-0000-4000-8000-000000000005','5eede001-0000-4000-8000-000000000005','Risotto aux champignons','Riz crémeux et parmesan.',date('now','+10 days')||'T19:00:00Z',120,3,'PUBLIC','OPEN',1,1,'Lyon 5e','Lyon','69005',45.760,4.823,NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-6 days'),'[{"label":"Champignons","quantity":400,"unit":"G"},{"label":"Parmesan","quantity":150,"unit":"G"}]'),
('5eede100-0000-4000-8000-000000000006','5eede001-0000-4000-8000-000000000006','Lasagnes végétariennes','Béchamel, épinards et mozzarella.',date('now','+12 days')||'T18:30:00Z',120,4,'PUBLIC','FULL',1,0,'Lyon 8e','Lyon','69008',45.735,4.865,NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-7 days'),'[{"label":"Épinards","quantity":300,"unit":"G"},{"label":"Mozzarella","quantity":250,"unit":"G"}]'),
('5eede100-0000-4000-8000-000000000007','5eede001-0000-4000-8000-000000000007','Atelier sushis','Préparation et dégustation de sushis.',date('now','+14 days')||'T11:00:00Z',180,5,'PUBLIC','OPEN',1,1,'Lyon 2e','Lyon','69002',45.754,4.823,NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-8 days'),'[{"label":"Riz à sushi","quantity":500,"unit":"G"},{"label":"Nori","quantity":10,"unit":"UNIT"}]'),
('5eede100-0000-4000-8000-000000000008','5eede001-0000-4000-8000-000000000008','Gratin dauphinois','Repas convivial déjà passé.',date('now','-2 days')||'T12:00:00Z',120,5,'PUBLIC','PASSED',1,0,'Lyon 4e','Lyon','69004',45.781,4.826,NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-20 days'),'[{"label":"Pommes de terre","quantity":1.5,"unit":"KG"}]');

-- R1 : chaque table possède sa participation HOST CONFIRMED.
INSERT INTO participations (id,tableId,userId,role,status,joinedAt) VALUES
('5eede200-0000-4000-8000-000000000101','5eede100-0000-4000-8000-000000000001','5eede001-0000-4000-8000-000000000001','HOST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-5 days')),
('5eede200-0000-4000-8000-000000000102','5eede100-0000-4000-8000-000000000001','5eede001-0000-4000-8000-000000000008','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-4 days')),
('5eede200-0000-4000-8000-000000000103','5eede100-0000-4000-8000-000000000001','5eede001-0000-4000-8000-000000000009','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-3 days')),
('5eede200-0000-4000-8000-000000000201','5eede100-0000-4000-8000-000000000002','5eede001-0000-4000-8000-000000000002','HOST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-4 days')),
('5eede200-0000-4000-8000-000000000202','5eede100-0000-4000-8000-000000000002','5eede001-0000-4000-8000-000000000010','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-3 days')),
('5eede200-0000-4000-8000-000000000203','5eede100-0000-4000-8000-000000000002','5eede001-0000-4000-8000-000000000011','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-2 days')),
('5eede200-0000-4000-8000-000000000301','5eede100-0000-4000-8000-000000000003','5eede001-0000-4000-8000-000000000003','HOST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-3 days')),
('5eede200-0000-4000-8000-000000000302','5eede100-0000-4000-8000-000000000003','5eede001-0000-4000-8000-000000000012','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-2 days')),
('5eede200-0000-4000-8000-000000000303','5eede100-0000-4000-8000-000000000003','5eede001-0000-4000-8000-000000000001','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-1 days')),
('5eede200-0000-4000-8000-000000000401','5eede100-0000-4000-8000-000000000004','5eede001-0000-4000-8000-000000000004','HOST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-2 days')),
('5eede200-0000-4000-8000-000000000402','5eede100-0000-4000-8000-000000000004','5eede001-0000-4000-8000-000000000005','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-1 days')),
('5eede200-0000-4000-8000-000000000403','5eede100-0000-4000-8000-000000000004','5eede001-0000-4000-8000-000000000006','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-1 days')),
('5eede200-0000-4000-8000-000000000501','5eede100-0000-4000-8000-000000000005','5eede001-0000-4000-8000-000000000005','HOST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-6 days')),
('5eede200-0000-4000-8000-000000000502','5eede100-0000-4000-8000-000000000005','5eede001-0000-4000-8000-000000000007','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-5 days')),
('5eede200-0000-4000-8000-000000000503','5eede100-0000-4000-8000-000000000005','5eede001-0000-4000-8000-000000000008','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-4 days')),
('5eede200-0000-4000-8000-000000000601','5eede100-0000-4000-8000-000000000006','5eede001-0000-4000-8000-000000000006','HOST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-7 days')),
('5eede200-0000-4000-8000-000000000602','5eede100-0000-4000-8000-000000000006','5eede001-0000-4000-8000-000000000009','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-6 days')),
('5eede200-0000-4000-8000-000000000603','5eede100-0000-4000-8000-000000000006','5eede001-0000-4000-8000-000000000010','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-5 days')),
('5eede200-0000-4000-8000-000000000604','5eede100-0000-4000-8000-000000000006','5eede001-0000-4000-8000-000000000011','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-4 days')),
('5eede200-0000-4000-8000-000000000701','5eede100-0000-4000-8000-000000000007','5eede001-0000-4000-8000-000000000007','HOST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-8 days')),
('5eede200-0000-4000-8000-000000000702','5eede100-0000-4000-8000-000000000007','5eede001-0000-4000-8000-000000000012','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-7 days')),
('5eede200-0000-4000-8000-000000000703','5eede100-0000-4000-8000-000000000007','5eede001-0000-4000-8000-000000000002','GUEST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-6 days')),
('5eede200-0000-4000-8000-000000000801','5eede100-0000-4000-8000-000000000008','5eede001-0000-4000-8000-000000000008','HOST','CONFIRMED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-20 days')),
('5eede200-0000-4000-8000-000000000802','5eede100-0000-4000-8000-000000000008','5eede001-0000-4000-8000-000000000001','GUEST','ATTENDED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-19 days')),
('5eede200-0000-4000-8000-000000000803','5eede100-0000-4000-8000-000000000008','5eede001-0000-4000-8000-000000000003','GUEST','ATTENDED',strftime('%Y-%m-%dT%H:%M:%SZ','now','-18 days'));

-- Apports : une contribution par participation, ou NONE pour un invité sans apport.
INSERT INTO contributions (id,participationId,label,quantity,unit,category,status) VALUES
('5eede300-0000-4000-8000-000000000101','5eede200-0000-4000-8000-000000000102','Châtaignes','300','G','INGREDIENT','CONFIRMED'),
('5eede300-0000-4000-8000-000000000102','5eede200-0000-4000-8000-000000000103','Salade verte','1','UNIT','APPETIZER','PROPOSED'),
('5eede300-0000-4000-8000-000000000201','5eede200-0000-4000-8000-000000000202','Pruneaux','200','G','INGREDIENT','PROPOSED'),
('5eede300-0000-4000-8000-000000000202','5eede200-0000-4000-8000-000000000203','',NULL,NULL,'NONE','PROPOSED'),
('5eede300-0000-4000-8000-000000000301','5eede200-0000-4000-8000-000000000302','Œufs','4','UNIT','INGREDIENT','CONFIRMED'),
('5eede300-0000-4000-8000-000000000302','5eede200-0000-4000-8000-000000000303','Nouilles','400','G','INGREDIENT','PROPOSED'),
('5eede300-0000-4000-8000-000000000401','5eede200-0000-4000-8000-000000000402','Anchois','150','G','INGREDIENT','PROPOSED'),
('5eede300-0000-4000-8000-000000000402','5eede200-0000-4000-8000-000000000403','Jus de pomme','1','L','DRINK','CONFIRMED'),
('5eede300-0000-4000-8000-000000000501','5eede200-0000-4000-8000-000000000502','Champignons','400','G','INGREDIENT','PROPOSED'),
('5eede300-0000-4000-8000-000000000502','5eede200-0000-4000-8000-000000000503','Parmesan','150','G','INGREDIENT','PROPOSED'),
('5eede300-0000-4000-8000-000000000601','5eede200-0000-4000-8000-000000000602','Épinards','300','G','INGREDIENT','CONFIRMED'),
('5eede300-0000-4000-8000-000000000602','5eede200-0000-4000-8000-000000000603','Mozzarella','250','G','INGREDIENT','CONFIRMED'),
('5eede300-0000-4000-8000-000000000603','5eede200-0000-4000-8000-000000000604','',NULL,NULL,'NONE','PROPOSED'),
('5eede300-0000-4000-8000-000000000701','5eede200-0000-4000-8000-000000000702','Riz à sushi','500','G','INGREDIENT','PROPOSED'),
('5eede300-0000-4000-8000-000000000702','5eede200-0000-4000-8000-000000000703','Nori','10','UNIT','INGREDIENT','CONFIRMED'),
('5eede300-0000-4000-8000-000000000801','5eede200-0000-4000-8000-000000000802','Pommes de terre','1.5','KG','INGREDIENT','BROUGHT'),
('5eede300-0000-4000-8000-000000000802','5eede200-0000-4000-8000-000000000803','',NULL,NULL,'NONE','BROUGHT');

-- Messages textuels, image et audio pour enrichir la messagerie.
INSERT INTO messages (id,tableId,authorId,type,text,audioUrl,imageUrl,durationSeconds,sentAt) VALUES
('5eede400-0000-4000-8000-000000000101','5eede100-0000-4000-8000-000000000001','5eede001-0000-4000-8000-000000000001','TEXT','Bienvenue, merci pour vos apports !',NULL,NULL,NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-3 days')),
('5eede400-0000-4000-8000-000000000102','5eede100-0000-4000-8000-000000000001','5eede001-0000-4000-8000-000000000008','TEXT','Je m occupe des châtaignes.',NULL,NULL,NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-2 days')),
('5eede400-0000-4000-8000-000000000103','5eede100-0000-4000-8000-000000000001','5eede001-0000-4000-8000-000000000009','IMAGE',NULL,NULL,'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=640&q=80&auto=format&fit=crop',NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-1 days')),
('5eede400-0000-4000-8000-000000000201','5eede100-0000-4000-8000-000000000002','5eede001-0000-4000-8000-000000000002','TEXT','Le tajine sera doux, idéal pour ce soir.',NULL,NULL,NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-1 days')),
('5eede400-0000-4000-8000-000000000202','5eede100-0000-4000-8000-000000000002','5eede001-0000-4000-8000-000000000010','AUDIO',NULL,'demo',NULL,12,strftime('%Y-%m-%dT%H:%M:%SZ','now','-12 hours')),
('5eede400-0000-4000-8000-000000000301','5eede100-0000-4000-8000-000000000003','5eede001-0000-4000-8000-000000000003','TEXT','Qui apporte les œufs ?',NULL,NULL,NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-1 days')),
('5eede400-0000-4000-8000-000000000302','5eede100-0000-4000-8000-000000000003','5eede001-0000-4000-8000-000000000012','TEXT','Je peux les prendre.',NULL,NULL,NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-8 hours')),
('5eede400-0000-4000-8000-000000000601','5eede100-0000-4000-8000-000000000006','5eede001-0000-4000-8000-000000000006','TEXT','C est complet, merci à tous !',NULL,NULL,NULL,strftime('%Y-%m-%dT%H:%M:%SZ','now','-1 days'));
