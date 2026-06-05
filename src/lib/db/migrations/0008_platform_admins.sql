-- Administrateurs PLATEFORME (super-admin) — opérateurs de la plateforme,
-- distincts des utilisateurs des cabinets (aucun cabinet_id). Console /platform.
-- Table hors périmètre tenant : pas de RLS (accédée via la connexion propriétaire).
CREATE TABLE IF NOT EXISTS platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id text NOT NULL UNIQUE,
  email varchar(255) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
