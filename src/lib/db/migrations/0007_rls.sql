-- ═══════════════════════════════════════════════════════════
-- RLS — filet de sécurité d'isolation au NIVEAU BASE (défense en profondeur).
--
-- SÛR À APPLIQUER : on active RLS SANS FORCE. Le rôle propriétaire (postgres,
-- utilisé par l'app aujourd'hui) n'est PAS soumis à RLS tant que FORCE n'est pas
-- posé → cette migration ne change RIEN au comportement actuel.
--
-- RLS ne "mord" que lorsque les requêtes tournent sous le rôle `app_tenant`
-- (non-propriétaire, sans BYPASSRLS), via le helper withTenant() qui fait
-- `set local role app_tenant` + `set_config('app.cabinet_id', …)` dans une
-- transaction. Sans GUC → current_setting renvoie NULL → aucune ligne visible
-- (fail-closed). Le bootstrap d'auth (getCurrentUser, lecture users par auth_id)
-- reste en `postgres` (hors withTenant) → pas de problème d'amorçage.
--
-- ACTIVATION (plus tard, avant le 2e cabinet réel) : router les requêtes de
-- données tenant via withTenant(cabinetId, tx => …). Idempotent.
-- ═══════════════════════════════════════════════════════════

-- 1) Rôle applicatif sans BYPASSRLS
DO $$ BEGIN
  CREATE ROLE app_tenant NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- NB activation RLS :
--  • En local (superuser), `set local role app_tenant` suffit (cf. withTenant + rls.test).
--  • Sur Supabase, `GRANT app_tenant TO postgres` est INTERDIT (garde-fou anti-escalade) →
--    l'activation se fera via une CONNEXION DÉDIÉE app_tenant (login + mot de passe,
--    DATABASE_URL séparé), pas via SET ROLE. RLS reste dormante d'ici là.
GRANT USAGE ON SCHEMA public TO app_tenant;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_tenant;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_tenant;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_tenant;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_tenant;

-- 2) Politique d'isolation sur toutes les tables tenant (discriminant cabinet_id)
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'users','companies','company_members','documents','invoices','invoice_items',
    'notifications','fiscal_deadlines','audit_logs','document_comments','time_entries',
    'access_logs','kyc_documents','workflow_templates','workflow_template_tasks',
    'workflows','workflow_tasks','document_requests','portal_messages','activity_sessions'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      || 'USING (cabinet_id = current_setting(''app.cabinet_id'', true)::uuid) '
      || 'WITH CHECK (cabinet_id = current_setting(''app.cabinet_id'', true)::uuid)',
      t
    );
  END LOOP;
END $$;

-- 3) Politique sur `cabinets` (le tenant lui-même, discriminé par id)
ALTER TABLE cabinets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON cabinets;
CREATE POLICY tenant_isolation ON cabinets
  USING (id = current_setting('app.cabinet_id', true)::uuid)
  WITH CHECK (id = current_setting('app.cabinet_id', true)::uuid);
