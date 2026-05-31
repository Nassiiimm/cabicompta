import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

// Parseur CSV minimal mais robuste (gère les champs entre guillemets et les "" échappés)
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
        } else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const vals = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = vals[i] ?? ""));
    return row;
  });
}

// Récupère une valeur par plusieurs noms de colonne possibles (FR/EN)
const pick = (row: Record<string, string>, ...keys: string[]): string | null => {
  for (const k of keys) {
    const v = row[k.toLowerCase()];
    if (v && v.trim()) return v.trim();
  }
  return null;
};

const VALID_TYPES = ["T1_PARTICULIER", "T1_AUTONOME", "T2_SOCIETE"];

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const { csv } = await request.json();
    if (typeof csv !== "string" || !csv.trim()) {
      return Response.json({ error: "CSV vide" }, { status: 400 });
    }

    const rows = parseCsv(csv);
    if (rows.length === 0) {
      return Response.json({ error: "Aucune ligne exploitable (en-tête + au moins une ligne requis)" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [i, row] of rows.entries()) {
      const name = pick(row, "nom", "name", "raison sociale", "client");
      if (!name) { errors.push(`Ligne ${i + 2} : nom manquant`); continue; }

      const neq = pick(row, "neq", "numéro entreprise");
      const rawType = pick(row, "type");
      const type = rawType && VALID_TYPES.includes(rawType.toUpperCase()) ? rawType.toUpperCase() : null;

      // Déduplication : par NEQ si présent, sinon par nom (insensible à la casse)
      const dupCondition = neq
        ? sql`lower(${companies.neq}) = lower(${neq}) or lower(${companies.name}) = lower(${name})`
        : sql`lower(${companies.name}) = lower(${name})`;
      const [existing] = await db.select({ id: companies.id }).from(companies).where(dupCondition).limit(1);
      if (existing) { skipped++; continue; }

      await db.insert(companies).values({
        name,
        neq,
        type: type as "T1_PARTICULIER" | "T1_AUTONOME" | "T2_SOCIETE" | null,
        address: pick(row, "adresse", "address"),
        city: pick(row, "ville", "city"),
        province: pick(row, "province") ?? "QC",
        postalCode: pick(row, "code postal", "postalcode", "code_postal", "cp"),
        phone: pick(row, "téléphone", "telephone", "phone", "tél"),
        email: pick(row, "courriel", "email", "courriel "),
      });
      created++;
    }

    logAudit({
      userId: user.id,
      action: "IMPORT",
      tableName: "companies",
      newData: { created, skipped, total: rows.length },
    });

    return Response.json({ created, skipped, total: rows.length, errors });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Réservé à l'administrateur" }, { status: 403 });
    }
    console.error("POST /api/admin/import-clients error:", error);
    return Response.json({ error: "Erreur lors de l'import" }, { status: 500 });
  }
}
