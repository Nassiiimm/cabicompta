// Importe scripts/out/preview.json dans la table companies (cabinet CFC).
// - Secrets scalaires (mots de passe, NAS) chiffrés AES-256-GCM (idem src/lib/crypto.ts)
// - Blobs importRaw / bankCredentials / softwareCredentials chiffrés entiers ({enc:"..."})
// - Idempotent : une société déjà présente (même NEQ dans le cabinet) est ignorée
//
// Usage : node scripts/import-oll.mjs            (dry-run : affiche le plan)
//         node scripts/import-oll.mjs --commit   (insère réellement)

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createCipheriv, randomBytes, createHash } from "node:crypto";
import postgres from "../node_modules/postgres/src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMIT = process.argv.includes("--commit");
const CFC_CABINET_ID = "c9015627-8bb5-41de-aca4-abd23e5d9546";
const IMPORT_SOURCE = "OLL-EXCEL SOCIÉTÉ.xlsx";

// ---- env (.env.local) ----
const envText = readFileSync(resolve(__dirname, "..", ".env.local"), "utf8");
const env = Object.fromEntries(
  envText.split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const DATABASE_URL = env.DATABASE_URL || process.env.DATABASE_URL;
const ENCRYPTION_KEY = env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
if (!DATABASE_URL || !ENCRYPTION_KEY) throw new Error("DATABASE_URL ou ENCRYPTION_KEY manquante dans .env.local");

// ---- crypto (réplique exacte de src/lib/crypto.ts) ----
const PREFIX = "enc:v1:";
const KEY = createHash("sha256").update(ENCRYPTION_KEY, "utf8").digest();
function encryptSecret(plain) {
  if (plain == null) return null;
  const v = String(plain);
  if (v === "") return null;
  if (v.startsWith(PREFIX)) return v;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([c.update(v, "utf8"), c.final()]);
  return PREFIX + [iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
}
// Chiffre un objet/blob entier → { enc: "enc:v1:..." }
const encBlob = (obj) => (obj && (Array.isArray(obj) ? obj.length : Object.keys(obj).length))
  ? { enc: encryptSecret(JSON.stringify(obj)) } : null;

// ---- mapping ----
const societies = JSON.parse(readFileSync(resolve(__dirname, "out", "preview.json"), "utf8"));

function toRow(c) {
  const isCorp = /inc\b|qu[ée]bec|ltée|association|centre|complexe|assembl/i.test(c.legalName || c.name || "");
  const noteParts = [];
  if (c.needsReview) noteParts.push("⚠️ À VÉRIFIER (import OLL) : " + (c.reviewReason || "fiche ambiguë"));
  noteParts.push(`Importé depuis « ${IMPORT_SOURCE} » (feuille « ${c.sheet} »).`);

  return {
    cabinet_id: CFC_CABINET_ID,
    name: (c.name || "(sans nom)").slice(0, 255),
    legal_name: c.legalName?.slice(0, 255) || null,
    trade_name: c.tradeName?.slice(0, 255) || null,
    neq: c.neq || null,
    tps_number: c.tpsNumber || null,
    tvq_number: c.tvqNumber || null,
    fiscal_year_end: c.fiscalYearEnd || null,
    incorporation_date: c.incorporationDate || null,
    address: c.address || null,
    phone: c.phone?.slice(0, 20) || null,
    email: c.email?.slice(0, 255) || null,
    type: isCorp ? "T2_SOCIETE" : null,
    status: c.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    notes: noteParts.join("\n"),
    representative_sin: encryptSecret(c.representativeSin),
    clicsequr_id: c.clicEntreprise?.id?.slice(0, 255) || null,
    clicsequr_password: encryptSecret(c.clicEntreprise?.password),
    clicsequr_express_id: c.clicExpress?.id?.slice(0, 255) || null,
    clicsequr_express_password: encryptSecret(c.clicExpress?.password),
    arc_id: c.arc?.id?.slice(0, 255) || null,
    arc_password: encryptSecret(c.arc?.password),
    bank_credentials: encBlob(c.bankCredentials),
    software_credentials: encBlob(c.softwareCredentials),
    import_raw: encBlob(c.importRaw),
    import_source: IMPORT_SOURCE,
  };
}

const sql = postgres(DATABASE_URL, { prepare: false });

try {
  const existing = await sql`select neq from companies where cabinet_id = ${CFC_CABINET_ID} and neq is not null`;
  const existingNeq = new Set(existing.map((r) => r.neq));

  const rows = societies.map(toRow);
  const toInsert = rows.filter((r) => !r.neq || !existingNeq.has(r.neq));
  const skipped = rows.length - toInsert.length;

  console.log(`Sociétés dans la preview : ${rows.length}`);
  console.log(`  déjà en base (NEQ)     : ${skipped}`);
  console.log(`  à insérer              : ${toInsert.length}`);
  console.log(`  dont « à vérifier »    : ${societies.filter((c) => c.needsReview).length}`);

  if (!COMMIT) {
    console.log("\n[DRY-RUN] Aucune écriture. Relancer avec --commit pour insérer.");
    console.log("Exemple de ligne (secrets chiffrés) :");
    const s = toInsert[0];
    console.log({ name: s.name, neq: s.neq, clicsequr_password: s.clicsequr_password?.slice(0, 40) + "…", import_raw: s.import_raw ? "{enc:…}" : null });
    await sql.end();
    process.exit(0);
  }

  let inserted = 0;
  await sql.begin(async (tx) => {
    for (const r of toInsert) {
      await tx`insert into companies ${tx(r)}`;
      inserted++;
    }
  });
  console.log(`\n✅ ${inserted} sociétés insérées dans le cabinet CFC.`);
} finally {
  await sql.end();
}
