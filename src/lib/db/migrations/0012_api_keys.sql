-- Clés API pour l'ingestion externe (ex. agent Claude Code du cabinet qui injecte des PDFs).
-- La clé en clair n'est JAMAIS stockée : seul son hash SHA-256 l'est. Scope minimal, révocable.

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id uuid NOT NULL REFERENCES cabinets(id) ON DELETE restrict,
  created_by uuid NOT NULL REFERENCES users(id),
  name varchar(255) NOT NULL,
  key_hash varchar(64) NOT NULL UNIQUE,      -- SHA-256 hex de la clé
  key_prefix varchar(16) NOT NULL,           -- préfixe lisible pour identifier la clé (ex. cck_AbCd…)
  scope varchar(50) NOT NULL DEFAULT 'ingest',
  last_used_at timestamp,
  revoked_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_keys_cabinet_idx ON api_keys(cabinet_id);
CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys(key_hash);
