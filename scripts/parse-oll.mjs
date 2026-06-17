// Parser best-effort du classeur OLL "OLL-EXCEL SOCIÉTÉ.xlsx".
// Découpe la feuille en blocs (1 société = 1 bloc), extrait les champs clés
// et conserve l'intégralité du bloc source dans `importRaw` (zéro perte).
//
// Sortie : scripts/out/preview.json  +  scripts/out/preview.xlsx
//
// Usage: node scripts/parse-oll.mjs "/Users/nassim/Downloads/OLL-EXCEL SOCIÉTÉ.xlsx"

import * as XLSX from "/tmp/node_modules/xlsx/xlsx.mjs";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = process.argv[2] || "/Users/nassim/Downloads/OLL-EXCEL SOCIÉTÉ.xlsx";
const OUT_DIR = resolve(__dirname, "out");

// ---------- helpers ----------
const clean = (v) => String(v ?? "").trim();
const isBlankRow = (r) => !r.some((c) => clean(c));
const MONTHS = {
  jan: 1, janv: 1, fev: 2, "fév": 2, feb: 2, mar: 3, mars: 3, avr: 4, apr: 4,
  mai: 5, may: 5, jun: 6, juin: 6, jul: 7, juil: 7, aug: 8, aout: 8, "août": 8,
  sep: 9, sept: 9, oct: 10, nov: 11, dec: 12, "déc": 12,
};

function parseFiscalYearEnd(s) {
  // "Fin d'exercise : 31 DEC 2023" | "31 MARS 2023" | "30 SEPTEMBRE"
  const m = clean(s).match(/(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\.?\s*(\d{4})?/);
  if (!m) return null;
  const day = +m[1];
  const mon = MONTHS[m[2].toLowerCase().slice(0, 4)] ?? MONTHS[m[2].toLowerCase().slice(0, 3)];
  if (!mon || day < 1 || day > 31) return null;
  const year = m[3] ? +m[3] : new Date().getFullYear();
  return `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateISO(s) {
  const m = clean(s).match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// Détecte une ligne "en-tête de société".
function isHeaderRow(r) {
  const name = clean(r[1]);
  const tps = clean(r[2]).replace(/\s/g, "");
  const tvq = clean(r[3]).replace(/\s/g, "");
  const t2 = clean(r[4]);
  const hasFinEx = /fin d.exercise/i.test(r.join(" "));
  const looksTps = /^\d{9}$/.test(tps);
  const looksTvq = /^12\d{8}$/.test(tvq);
  // en-tête = un nom + (n° TPS OU n° TVQ OU "Fin d'exercise")
  return !!name && name.length > 1 && /[A-Za-zÀ-ÿ]/.test(name) &&
    (looksTps || looksTvq || hasFinEx) &&
    !/^(MDP|ID|NEQ|USER|TPS|TVQ|NOM|ARC|TEL|E-?MAIL|ADRESSE|NAS|code|clic)/i.test(name);
}

// ---------- chargement ----------
const wb = XLSX.read(readFileSync(SRC), { type: "buffer" });
const rowsOf = (n) =>
  XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: "" })
    .map((r) => r.map(clean));

function sliceBlocks(rows, startAt) {
  // Trouve les indices des en-têtes de société, découpe entre eux.
  const anchors = [];
  for (let i = startAt; i < rows.length; i++) {
    if (isHeaderRow(rows[i])) anchors.push(i);
  }
  const blocks = [];
  for (let a = 0; a < anchors.length; a++) {
    const start = anchors[a];
    const end = a + 1 < anchors.length ? anchors[a + 1] : rows.length;
    const slice = rows.slice(start, end).filter((r) => !isBlankRow(r));
    if (slice.length) blocks.push(slice);
  }
  return blocks;
}

// Extrait les champs d'un bloc.
function extractBlock(block, sheet, status) {
  const header = block[0];
  const flat = block.flat();
  const joined = flat.join(" • ");

  const tradeName = clean(header[1]);
  const tps = clean(header[2]).replace(/\s/g, "").match(/^\d{9}$/)?.[0] || null;
  const tvq = clean(header[3]).replace(/\s/g, "").match(/^12\d{8}$/)?.[0] || null;
  const fiscalYearEnd = parseFiscalYearEnd(joined.match(/fin d.exercise\s*:?\s*([^•]+)/i)?.[1] || "");

  // nom légal : "9410-8859 Québec inc." | "QC INC"
  let legalName = null;
  for (const c of flat) {
    if (/\d{4}-\d{4}.*(qu[ée]bec|qc)\s*inc/i.test(c)) { legalName = c; break; }
  }

  // NEQ : commence par 11 (TVQ commence par 12) — 10 chiffres
  let neq = null;
  for (const c of flat) {
    const m = c.replace(/\s/g, "").match(/(?:NEQ\s*:?\s*)?(11\d{8})\b/i);
    if (m) { neq = m[1]; break; }
  }

  const incorporationDate = (() => {
    for (const c of flat) if (/constitution/i.test(c)) { const d = parseDateISO(c); if (d) return d; }
    return null;
  })();

  // email : 1ʳᵉ cellule contenant @ (hors cabinet)
  let email = null;
  for (const c of flat) {
    const m = c.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (m && !/cabinet\.cfc1|lamriben1984/i.test(m[0])) { email = m[0].replace(/,/g, "."); break; }
  }

  // téléphone
  let phone = null;
  for (let i = 0; i < block.length; i++) {
    if (/^tel/i.test(clean(block[i][1]))) {
      const m = block[i].slice(2).join(" ").match(/[\d().\s-]{8,}/);
      if (m) { phone = m[0].trim(); break; }
    }
  }

  // adresse
  let address = null;
  for (let i = 0; i < block.length; i++) {
    if (/^adresse$/i.test(clean(block[i][1])) || /^adresse/i.test(clean(block[i][1]))) {
      address = clean(block[i][2]) || clean(block[i].slice(2).find((c) => clean(c))) || null;
      if (address) break;
    }
  }

  // NAS représentant
  let representativeSin = null;
  for (const c of flat) {
    const m = c.match(/NAS\s*:?\s*(\d{3}[\s-]?\d{3}[\s-]?\d{3})/i);
    if (m) { representativeSin = m[1].replace(/\D/g, ""); break; }
  }

  // ClicSéqur Entreprise / Express (user+mdp dans cellules voisines, best-effort)
  function grabAuth(re) {
    for (let i = 0; i < block.length; i++) {
      const row = block[i];
      if (re.test(row.join(" "))) {
        const id = clean(row[3]) || clean(row[2]) || null;
        // mdp : ligne suivante contenant "MDP"/"mot de passe"
        let pwd = null;
        for (let j = i; j < Math.min(i + 3, block.length); j++) {
          if (/mdp|mot de passe/i.test(block[j].join(" "))) {
            pwd = clean(block[j][3]) || clean(block[j][2]) || null;
            if (pwd && !/^(MDP|mot de passe)/i.test(pwd)) break;
          }
        }
        return { id, password: pwd };
      }
    }
    return null;
  }
  const clicEntreprise = grabAuth(/clic\s*s[ée]qur.{0,14}(entreprise|de l)/i);
  const clicExpress = grabAuth(/clic\s*s[ée]qur.{0,8}express/i);
  const arc = grabAuth(/^ARC\b/i);

  // Banques détectées (liste, brut)
  const BANKS = ["RBC", "ROYAL", "BMO", "DESJARDINS", "CIBC", "TD", "BNC", "BMO", "TANGERINE", "BANQUE NATIONALE"];
  const bankCredentials = [];
  for (let i = 0; i < block.length; i++) {
    const label = clean(block[i][1]).toUpperCase();
    const bank = BANKS.find((b) => label.includes(b));
    if (bank) bankCredentials.push({ bank, raw: block[i].slice(1).filter(clean) });
  }

  // Logiciels tiers
  const SOFT = ["QUICKBOOK", "DEXT", "CLOVER", "ADP", "PENNYLANE", "SAGE", "MICROSOFT"];
  const softwareCredentials = [];
  for (let i = 0; i < block.length; i++) {
    const label = clean(block[i][1]).toUpperCase();
    const soft = SOFT.find((s) => label.includes(s));
    if (soft) softwareCredentials.push({ software: soft, raw: block[i].slice(1).filter(clean) });
  }

  const name = legalName || tradeName || "(sans nom)";

  return {
    sheet,
    status,
    name,
    tradeName: tradeName && tradeName !== legalName ? tradeName : null,
    legalName,
    neq,
    tpsNumber: tps,
    tvqNumber: tvq,
    fiscalYearEnd,
    incorporationDate,
    email,
    phone,
    address,
    representativeSin,
    clicEntreprise,
    clicExpress,
    arc,
    bankCredentials,
    softwareCredentials,
    // zéro perte : tout le bloc source
    importRaw: block.map((r) => r.filter((_, idx) => idx <= 12)),
  };
}

// ---------- run ----------
mkdirSync(OUT_DIR, { recursive: true });
const all = [];

// Feuille principale : les sociétés clientes commencent après le préambule cabinet (~ligne "SOCIÉTÉS").
const main = rowsOf("Societe Client");
const startMain = main.findIndex((r) => /^SOCI[ÉE]T[ÉE]S$/i.test(clean(r[4])) || /^NOM$/i.test(clean(r[1])) && main.indexOf(r) > 50);
const mainStart = startMain > 0 ? startMain : 105;
for (const b of sliceBlocks(main, mainStart)) all.push(extractBlock(b, "Societe Client", "ACTIVE"));

// Feuille SOCIETE FERME (format blocs similaire)
const ferme = rowsOf("SOCIETE FERME");
for (const b of sliceBlocks(ferme, 0)) all.push(extractBlock(b, "SOCIETE FERME", "INACTIVE"));

// ---------- dédoublonnage + nettoyage ----------
// Corrige le faux n° TPS = NAS (9 chiffres) : si pas de NEQ ni TVQ et nom = personne, c'est un fragment.
const isPersonName = (n) =>
  n && !/inc\b|qu[ée]bec|association|centre|complexe|assembl[ée]e|coiffure|restaurant|\bltée\b/i.test(n) &&
  /^[A-ZÀ-Ÿ][\wÀ-ÿ'’.-]*(\s+[A-ZÀ-Ÿ'][\wÀ-ÿ'’.-]*){0,2}$/.test(n.replace(/\s+(NAS|SIN)$/i, ""));

for (const c of all) {
  // un bloc sans NEQ et sans TVQ dont le "TPS" est en réalité un NAS → on l'annule
  if (!c.neq && !c.tvqNumber && isPersonName(c.name)) {
    c.tpsNumber = null;
    c.needsReview = true;
    c.reviewReason = "Possible fragment dirigeant (nom de personne, pas de NEQ)";
  }
}

function mergeInto(target, src) {
  const keys = ["tradeName", "legalName", "neq", "tpsNumber", "tvqNumber", "fiscalYearEnd",
    "incorporationDate", "email", "phone", "address", "representativeSin",
    "clicEntreprise", "clicExpress", "arc"];
  for (const k of keys) if (!target[k] && src[k]) target[k] = src[k];
  target.bankCredentials = [...target.bankCredentials, ...src.bankCredentials];
  target.softwareCredentials = [...target.softwareCredentials, ...src.softwareCredentials];
  target.importRaw = [...target.importRaw, ["———"], ...src.importRaw];
  if (src.status === "INACTIVE") target.status = "INACTIVE"; // présent dans FERME = fermée
}

const byNeq = new Map();
const noNeq = new Map();
const merged = [];
for (const c of all) {
  if (c.neq) {
    if (byNeq.has(c.neq)) mergeInto(byNeq.get(c.neq), c);
    else { byNeq.set(c.neq, c); merged.push(c); }
  } else {
    const key = c.name.toUpperCase().replace(/\s+/g, " ").trim();
    if (noNeq.has(key)) mergeInto(noNeq.get(key), c);
    else { noNeq.set(key, c); merged.push(c); }
  }
}

writeFileSync(resolve(OUT_DIR, "preview.json"), JSON.stringify(merged, null, 2));
const allOut = merged;

// Excel lisible
const flatRows = allOut.map((c, i) => ({
  "#": i + 1,
  Feuille: c.sheet,
  Statut: c.status,
  Nom: c.name,
  Enseigne: c.tradeName || "",
  "Nom légal": c.legalName || "",
  NEQ: c.neq || "",
  TPS: c.tpsNumber || "",
  TVQ: c.tvqNumber || "",
  "Fin exercice": c.fiscalYearEnd || "",
  Constitution: c.incorporationDate || "",
  Email: c.email || "",
  Tel: c.phone || "",
  Adresse: c.address || "",
  NAS: c.representativeSin ? "***" + c.representativeSin.slice(-3) : "",
  "ClicSéqur Ent.": c.clicEntreprise?.id || "",
  "ClicSéqur Exp.": c.clicExpress?.id || "",
  ARC: c.arc?.id || "",
  Banques: c.bankCredentials.map((b) => b.bank).join(", "),
  Logiciels: c.softwareCredentials.map((s) => s.software).join(", "),
  "Lignes brutes": c.importRaw.length,
}));
const ws = XLSX.utils.json_to_sheet(flatRows);
const owb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(owb, ws, "Sociétés");
writeFileSync(resolve(OUT_DIR, "preview.xlsx"), XLSX.write(owb, { type: "buffer", bookType: "xlsx" }));

// stats console
const stat = (f) => allOut.filter((c) => c[f]).length;
console.log(`Sociétés (après dédoublonnage) : ${allOut.length}`);
console.log(`  avec NEQ           : ${stat("neq")}`);
console.log(`  avec TPS           : ${stat("tpsNumber")}`);
console.log(`  avec TVQ           : ${stat("tvqNumber")}`);
console.log(`  avec fin exercice  : ${stat("fiscalYearEnd")}`);
console.log(`  avec constitution  : ${stat("incorporationDate")}`);
console.log(`  avec email         : ${stat("email")}`);
console.log(`  avec tél           : ${stat("phone")}`);
console.log(`  avec ClicSéqur Ent : ${allOut.filter((c) => c.clicEntreprise).length}`);
console.log(`  avec banque(s)     : ${allOut.filter((c) => c.bankCredentials.length).length}`);
console.log(`Sortie : ${OUT_DIR}/preview.json  +  preview.xlsx`);
