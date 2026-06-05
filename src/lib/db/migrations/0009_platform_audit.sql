-- Journal d'audit des actions plateforme (super-admin) + flag active sur platform_admins.
ALTER TABLE platform_admins ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_admin_id uuid REFERENCES platform_admins(id) ON DELETE SET NULL,
  actor_email varchar(255),
  action varchar(50) NOT NULL,
  target_type varchar(50),
  target_id uuid,
  meta jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_audit_logs_created_idx ON platform_audit_logs (created_at DESC);
