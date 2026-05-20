-- Run once on existing databases created before alias column was added:
--   mysql -u root -p potters_duel < database/migrate-alias.sql

USE potters_duel;

ALTER TABLE cards
  ADD COLUMN alias VARCHAR(100) NULL AFTER name;

UPDATE cards SET alias = name WHERE alias IS NULL OR alias = '';
