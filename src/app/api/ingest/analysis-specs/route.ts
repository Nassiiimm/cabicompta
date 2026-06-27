import { requireApiKey } from "@/lib/api-key";
import { publicSpecs } from "@/lib/analysis/specs";

// GET /api/ingest/analysis-specs — canal POSTE (Claude Max du cabinet via MCP).
// Renvoie les consignes des 9 analyseurs (prompt + schéma) — source unique.
// Le Claude du poste applique la spec puis pousse via /api/ingest/documents.
export async function GET(request: Request) {
  try {
    await requireApiKey(request, "ingest");
    return Response.json({ specs: publicSpecs() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Unauthorized") return Response.json({ error: "Clé API invalide" }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: "Scope insuffisant" }, { status: 403 });
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
