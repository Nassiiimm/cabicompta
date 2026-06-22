-- Nouvelles catégories de documents pour couvrir la production fiscale des sociétés
-- (intégration FiscalAuto) : déclaration de société T2/CO-17, relevés d'emploi T4/RL-1, T4A.
-- ALTER TYPE ... ADD VALUE doit s'exécuter hors transaction (autocommit).

ALTER TYPE document_category ADD VALUE IF NOT EXISTS 'T2';
ALTER TYPE document_category ADD VALUE IF NOT EXISTS 'T4_RL1';
ALTER TYPE document_category ADD VALUE IF NOT EXISTS 'T4A';
