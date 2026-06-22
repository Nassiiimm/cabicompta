#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { basename, extname, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ── Chargement d'un fichier .env posé À CÔTÉ de ce script (config simplifiée) ─
// Permet de ne PAS avoir à passer la clé dans la commande : il suffit d'éditer
// le fichier .env du dossier. Les variables déjà définies dans l'environnement
// (ex. via `claude mcp add --env`) restent prioritaires.
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// ── Configuration ───────────────────────────────────────────────────────────
const API_URL = (process.env.CABICOMPTA_API_URL || "https://cabicompta.vercel.app").replace(/\/$/, "");
const API_KEY = process.env.CABICOMPTA_API_KEY;
if (!API_KEY) {
  console.error("[cabicompta-mcp] CABICOMPTA_API_KEY manquante : ajoute-la dans le fichier .env du dossier, ou via `claude mcp add --env`.");
  process.exit(1);
}

const CATEGORIES = [
  "DAS", "TPS_TVQ", "FINANCIAL_STATEMENT", "T1", "T2", "T4_RL1", "T4A", "REQ_DOC", "IMMOBILISATION",
  "BANK_STATEMENT", "INVOICE", "TAX_NOTICE", "CORPORATE", "CONTRACT", "RECEIPT", "OTHER",
];

const MIME = {
  ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".tif": "image/tiff", ".tiff": "image/tiff", ".heic": "image/heic",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain", ".csv": "text/csv",
};

const authHeaders = { Authorization: `Bearer ${API_KEY}` };
const ok = (text) => ({ content: [{ type: "text", text }] });
const fail = (text) => ({ content: [{ type: "text", text }], isError: true });

const server = new McpServer({ name: "cabicompta", version: "1.0.0" });

// ── Outil : lister les sociétés du cabinet ─────────────────────────────────
server.registerTool(
  "list_companies",
  {
    title: "Lister les sociétés du cabinet",
    description:
      "Renvoie la liste des sociétés clientes du cabinet (id, nom, NEQ, type, fin d'exercice). " +
      "À utiliser AVANT d'injecter un document pour rattacher le PDF à la bonne société (par NEQ de préférence, sinon par nom).",
    inputSchema: {},
  },
  async () => {
    try {
      const res = await fetch(`${API_URL}/api/ingest/companies`, { headers: authHeaders });
      if (!res.ok) return fail(`Erreur ${res.status} : ${await res.text()}`);
      const { companies } = await res.json();
      return ok(JSON.stringify(companies, null, 2));
    } catch (e) {
      return fail(`Échec de la requête : ${e.message}`);
    }
  }
);

// ── Outil : injecter un document ───────────────────────────────────────────
server.registerTool(
  "upload_document",
  {
    title: "Injecter un document dans CabiCompta",
    description:
      "Téléverse un fichier local (PDF, image, Word/Excel, CSV) dans CabiCompta et le rattache à une société. " +
      "Workflow recommandé : lis d'abord le contenu du PDF pour identifier la société (NEQ/nom), la catégorie et l'année fiscale, " +
      "puis appelle cet outil. Tu peux passer dans `extractedData` les données que tu as extraites du document " +
      "(texte, montants TPS/TVQ, dates…) — elles seront stockées sans OCR serveur. La cible est résolue par `neq` ou `companyId`.",
    inputSchema: {
      filePath: z.string().describe("Chemin absolu du fichier local à téléverser (ex. C:\\\\Docs\\\\facture.pdf)"),
      neq: z.string().optional().describe("NEQ de la société cible (recommandé)"),
      companyId: z.string().optional().describe("UUID de la société (alternative au NEQ)"),
      category: z.enum(CATEGORIES).optional().describe("Catégorie du document (défaut OTHER)"),
      fiscalYear: z.number().int().optional().describe("Année fiscale concernée (ex. 2024)"),
      subcategory: z.string().optional().describe("Sous-catégorie libre (≤ 50 car.)"),
      extractedData: z.string().optional().describe("Données extraites par toi, en JSON ou texte"),
      notes: z.string().optional().describe("Note libre sur le document"),
    },
  },
  async ({ filePath, neq, companyId, category, fiscalYear, subcategory, extractedData, notes }) => {
    if (!neq && !companyId) return fail("Indique soit `neq`, soit `companyId`.");
    let buffer;
    try {
      buffer = await readFile(filePath);
    } catch (e) {
      return fail(`Fichier illisible (${filePath}) : ${e.message}`);
    }
    const name = basename(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";

    const form = new FormData();
    form.append("file", new Blob([buffer], { type }), name);
    if (companyId) form.append("companyId", companyId);
    if (neq) form.append("neq", neq);
    if (category) form.append("category", category);
    if (fiscalYear != null) form.append("fiscalYear", String(fiscalYear));
    if (subcategory) form.append("subcategory", subcategory);
    if (extractedData) form.append("extractedData", extractedData);
    if (notes) form.append("notes", notes);

    try {
      const res = await fetch(`${API_URL}/api/ingest/documents`, {
        method: "POST",
        headers: authHeaders,
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return fail(`Erreur ${res.status} : ${body.error || JSON.stringify(body)}`);
      return ok(`✅ Document injecté : « ${name} » → ${body.document?.company} ` +
        `(catégorie ${body.document?.category}, statut ${body.document?.status}).`);
    } catch (e) {
      return fail(`Échec de l'envoi : ${e.message}`);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[cabicompta-mcp] prêt — API:", API_URL);
