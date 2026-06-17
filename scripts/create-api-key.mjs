// Génère une clé API d'ingestion pour un cabinet et l'enregistre (hash seul) en base.
// La clé en clair n'est affichée QU'UNE FOIS — à copier immédiatement.
//
// Usage : node scripts/create-api-key.mjs "<cabinetId>" "<createdByUserId>" "<nom>"

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes } from "node:crypto";
import postgres from "../node_modules/postgres/src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const [cabinetId, createdBy, name] = process.argv.slice(2);
if (!cabinetId || !createdBy || !name) {
  console.error('Usage : node scripts/create-api-key.mjs "<cabinetId>" "<userId>" "<nom>"');
  process.exit(1);
}

const envText = readFileSync(resolve(__dirname, "..", ".env.local"), "utf8");
const DATABASE_URL = envText.match(/DATABASE_URL=(.+)/)?.[1].trim();
if (!DATABASE_URL) throw new Error("DATABASE_URL manquante");

const plain = "cck_" + randomBytes(32).toString("base64url");
const hash = createHash("sha256").update(plain, "utf8").digest("hex");
const prefix = plain.slice(0, 12);

const sql = postgres(DATABASE_URL, { prepare: false });
try {
  await sql`
    insert into api_keys (cabinet_id, created_by, name, key_hash, key_prefix, scope)
    values (${cabinetId}, ${createdBy}, ${name}, ${hash}, ${prefix}, 'ingest')
  `;
  console.log("✅ Clé créée pour le cabinet", cabinetId);
  console.log("\n🔑 CLÉ (copie-la maintenant, elle ne sera plus jamais affichée) :\n");
  console.log("   " + plain + "\n");
} finally {
  await sql.end();
}
