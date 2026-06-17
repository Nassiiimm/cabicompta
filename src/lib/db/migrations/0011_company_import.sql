-- Import du référentiel clients depuis le classeur Excel OLL/CFC.
-- Champs structurés supplémentaires + conservation intégrale du bloc source (importRaw).
-- Les secrets (mots de passe, NAS) sont chiffrés au repos par la couche applicative (AES-256-GCM).

ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_name varchar(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trade_name varchar(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tps_number varchar(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tvq_number varchar(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS incorporation_date date;

-- ClicSéqur Express (distinct de ClicSéqur Entreprise déjà présent)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS clicsequr_express_id varchar(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS clicsequr_express_password text; -- chiffré

-- Dirigeant / représentant principal
ALTER TABLE companies ADD COLUMN IF NOT EXISTS representative_name varchar(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS representative_sin text; -- chiffré (NAS)

-- Credentials multiples (banques secondaires, logiciels tiers) — secrets chiffrés à l'intérieur
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_credentials jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS software_credentials jsonb;

-- Traçabilité de l'import : bloc source intégral + provenance
ALTER TABLE companies ADD COLUMN IF NOT EXISTS import_raw jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS import_source varchar(255);
