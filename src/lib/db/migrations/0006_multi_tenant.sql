-- ═══════════════════════════════════════════════════════════
-- Multi-tenant : introduction de la notion de « cabinet » (tenant).
-- Toutes les tables métier reçoivent cabinet_id (NOT NULL, FK, index).
-- Sur une base existante (prod CFC) : backfill de toutes les lignes vers
-- le cabinet CFC. Sur une base vide (dev/local) : no-op de backfill.
-- Idempotent.
-- ═══════════════════════════════════════════════════════════

-- 1) Enum + table cabinets
DO $$ BEGIN
  CREATE TYPE cabinet_status AS ENUM ('ACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS cabinets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(63) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  legal_name varchar(255),
  status cabinet_status NOT NULL DEFAULT 'ACTIVE',
  plan varchar(50) NOT NULL DEFAULT 'pilot',
  display_name varchar(255),
  logo_url text,
  primary_color varchar(9),
  email_from varchar(255),
  contact_email varchar(255),
  contact_phone varchar(20),
  address text,
  settings jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- 2) Cabinet CFC (le pilote / données existantes)
INSERT INTO cabinets (slug, name, legal_name, display_name, email_from, contact_email, contact_phone, address)
VALUES ('cfc', 'CFC', 'Comptabilité Fiscalité & Conseil', 'CFC',
        'CFC <onboarding@resend.dev>', 'cabinet.cfc1@gmail.com', '438-764-1675',
        '3300 boulevard Rosemont, bureau 233, Montréal (QC) H1X 1K2')
ON CONFLICT (slug) DO NOTHING;

-- 3) cabinet_id sur toutes les tables tenant : ADD (nullable) → backfill CFC →
--    NOT NULL → FK → index. Boucle pour rester DRY.
DO $$
DECLARE
  t text;
  cfc uuid;
  tbls text[] := ARRAY[
    'users','companies','company_members','documents','invoices','invoice_items',
    'notifications','fiscal_deadlines','audit_logs','document_comments','time_entries',
    'access_logs','kyc_documents','workflow_templates','workflow_template_tasks',
    'workflows','workflow_tasks','document_requests','portal_messages','activity_sessions'
  ];
BEGIN
  SELECT id INTO cfc FROM cabinets WHERE slug = 'cfc';

  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS cabinet_id uuid', t);
    EXECUTE format('UPDATE %I SET cabinet_id = %L WHERE cabinet_id IS NULL', t, cfc);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN cabinet_id SET NOT NULL', t);

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = t || '_cabinet_id_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (cabinet_id) REFERENCES cabinets(id) ON DELETE RESTRICT',
        t, t || '_cabinet_id_fkey'
      );
    END IF;

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (cabinet_id)', t || '_cabinet_idx', t);
  END LOOP;
END $$;

-- 4) Numéro de facture : unique PAR cabinet (avant : unique global)
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c
  FROM pg_constraint
  WHERE conrelid = 'invoices'::regclass
    AND contype = 'u'
    AND conkey = (
      SELECT array_agg(attnum)
      FROM pg_attribute
      WHERE attrelid = 'invoices'::regclass AND attname = 'invoice_number'
    );
  IF c IS NOT NULL THEN
    EXECUTE 'ALTER TABLE invoices DROP CONSTRAINT ' || quote_ident(c);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_cabinet_invoice_number_idx
  ON invoices (cabinet_id, invoice_number);
