-- Présence automatique — temps actif passé sur l'app par employé
-- Distinct de time_entries (présence ≠ heures facturables par dossier).
-- Une ligne par (employé, jour), alimentée par les heartbeats du client.
CREATE TABLE IF NOT EXISTS activity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  active_seconds INTEGER NOT NULL DEFAULT 0,
  last_heartbeat_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS activity_user_date_idx
  ON activity_sessions (user_id, date);
