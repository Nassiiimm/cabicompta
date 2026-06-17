import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireApiKey } from "@/lib/api-key";

/**
 * Référentiel des sociétés du cabinet — pour qu'un agent externe (Claude du cabinet)
 * puisse rattacher chaque PDF à la bonne société (par NEQ ou nom).
 * Auth : clé API (Bearer). Ne renvoie AUCUN secret (pas de credentials).
 */
export async function GET(request: Request) {
  try {
    const { cabinetId } = await requireApiKey(request, "ingest");

    const rows = await db
      .select({
        id: companies.id,
        name: companies.name,
        legalName: companies.legalName,
        tradeName: companies.tradeName,
        neq: companies.neq,
        type: companies.type,
        status: companies.status,
        fiscalYearEnd: companies.fiscalYearEnd,
      })
      .from(companies)
      .where(and(eq(companies.cabinetId, cabinetId), isNull(companies.deletedAt)));

    return Response.json({ companies: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const msg = error instanceof Error ? error.message : "";
  if (msg === "Unauthorized") return Response.json({ error: "Clé API invalide" }, { status: 401 });
  if (msg === "Forbidden") return Response.json({ error: "Scope insuffisant" }, { status: 403 });
  return Response.json({ error: "Erreur serveur" }, { status: 500 });
}
