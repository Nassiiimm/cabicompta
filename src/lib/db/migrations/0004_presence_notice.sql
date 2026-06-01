-- Loi 25 : acquittement de la notice de surveillance de présence par l'employé.
-- Null = employé pas encore informé/acquitté. Conservé pour audit (responsabilité).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "presence_notice_acked_at" timestamp;
