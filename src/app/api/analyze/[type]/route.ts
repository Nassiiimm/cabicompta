import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth";
import { hasCompanyAccess } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { analyzeDocument } from "@/lib/ocr";
import { getSpec } from "@/lib/analysis/specs";
import type { AnalysisKey, StoredAnalysis } from "@/lib/analysis/types";

type RouteContext = { params: Promise<{ type: string }> };

// POST /api/analyze/[type] — canal WEB (API Anthropic payante).
// Body JSON : { documentId } — analyse un document déjà téléversé et stocke
// le résultat dans documents.extractedData.
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireStaff();
    const { type } = await context.params;

    const spec = getSpec(type);
    if (!spec) return Response.json({ error: `Type d'analyse inconnu: ${type}` }, { status: 400 });

    const { documentId } = await request.json().catch(() => ({}));
    if (!documentId) return Response.json({ error: "documentId requis" }, { status: 400 });

    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc || doc.deletedAt) return Response.json({ error: "Document introuvable" }, { status: 404 });

    // Garde-fou multi-tenant + cloisonnement INTERN/CLIENT
    if (doc.cabinetId !== user.cabinetId || !(await hasCompanyAccess(user, doc.companyId))) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: blob, error } = await supabase.storage.from("documents").download(doc.filePath);
    if (error || !blob) return Response.json({ error: "Erreur lecture fichier" }, { status: 500 });

    const buffer = Buffer.from(await blob.arrayBuffer());
    const mimeType = doc.mimeType || "application/pdf";

    const result = await analyzeDocument([{ buffer, mimeType }], type as AnalysisKey);

    const stored: StoredAnalysis = {
      analysisKey: type as AnalysisKey,
      analyzedAt: new Date().toISOString(),
      source: "web",
      result,
    };

    await db.update(documents)
      .set({ extractedData: stored, category: spec.category as typeof documents.$inferInsert.category, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    logAudit({
      cabinetId: user.cabinetId, userId: user.id, action: "UPDATE",
      tableName: "documents", recordId: documentId,
      newData: { analyse: type, via: "web" },
    });

    return Response.json({ ok: true, analysisKey: type, result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "Unauthorized") return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: "Forbidden" }, { status: 403 });
    if (/API key not valid|API_KEY_INVALID|invalid x-api-key|authentication/i.test(msg)) {
      return Response.json({ error: "Clé API Anthropic invalide ou absente." }, { status: 502 });
    }
    if (/quota|rate limit|overloaded|429|529/i.test(msg)) {
      return Response.json({ error: "Quota IA atteint. Réessayez dans un instant." }, { status: 502 });
    }
    return Response.json({ error: "L'analyse a échoué." }, { status: 500 });
  }
}
