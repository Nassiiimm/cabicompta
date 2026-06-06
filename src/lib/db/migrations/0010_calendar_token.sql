-- Flux iCal des échéances : jeton d'abonnement par utilisateur (secret dans l'URL
-- du flux, comme tout calendrier iCal). Régénérable pour révoquer.
ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_token uuid UNIQUE;
