-- Mandat CFC + Loi 25 : consentement du client à l'analyse de ses documents
-- par l'IA (OCR/classement via Claude). Null = pas encore consenti. Auditable.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_consent_acked_at" timestamp;
