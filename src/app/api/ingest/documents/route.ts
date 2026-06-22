import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { companies, documents } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireApiKey } from "@/lib/api-key";
import { uploadFile } from "@/lib/supabase/storage";
import { logAudit } from "@/lib/audit";

const VALID_CATEGORIES = new Set([
  "DAS", "TPS_TVQ", "FINANCIAL_STATEMENT", "T1", "T2", "T4_RL1", "T4A", "REQ_DOC", "IMMOBILISATION",
  "BANK_STATEMENT", "INVOICE", "TAX_NOTICE", "CORPORATE", "CONTRACT", "RECEIPT", "OTHER",
]);

const ALLOWED_MIME = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp", "image/tiff", "image/heic", "image/heif",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
]);

/**
 * Ingestion d'un document par un agent externe (Claude du cabinet).
 * Le PDF est lu/classé/OCRisé côté agent ; ici on reçoit le fichier + métadonnées
 * + données déjà extraites (extractedData) et on range. Aucun coût OCR serveur.
 *
 * multipart/form-data :
 *   file           (requis)  le binaire
 *   companyId | neq (requis) cible — résolue dans le cabinet de la clé
 *   category       (opt.)    enum documentCategory, défaut OTHER
 *   subcategory    (opt.)
 *   fiscalYear     (opt.)    année (int)
 *   extractedData  (opt.)    JSON produit par l'agent (texte OCR, montants, etc.)
 *   notes          (opt.)
 */
export async function POST(request: NextRequest) {
  try {
    const { cabinetId, createdBy } = await requireApiKey(request, "ingest");

    const form = await request.formData();
    const file = form.get("file") as File | null;
    const companyIdRaw = (form.get("companyId") as string | null)?.trim() || null;
    const neq = (form.get("neq") as string | null)?.trim() || null;
    const category = (form.get("category") as string | null)?.trim() || null;
    const subcategory = (form.get("subcategory") as string | null)?.trim() || null;
    const fiscalYear = (form.get("fiscalYear") as string | null)?.trim() || null;
    const notes = (form.get("notes") as string | null)?.trim() || null;
    const extractedRaw = (form.get("extractedData") as string | null) || null;

    if (!file) return Response.json({ error: "Fichier manquant" }, { status: 400 });
    if (!companyIdRaw && !neq) {
      return Response.json({ error: "companyId ou neq requis" }, { status: 400 });
    }

    // Résolution de la société DANS le cabinet de la clé (jamais cross-tenant)
    const [company] = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(and(
        companyIdRaw ? eq(companies.id, companyIdRaw) : eq(companies.neq, neq!),
        eq(companies.cabinetId, cabinetId),
        isNull(companies.deletedAt),
      ))
      .limit(1);

    if (!company) {
      return Response.json({ error: "Société introuvable dans ce cabinet" }, { status: 404 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: "Le fichier dépasse 10 Mo" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return Response.json({ error: `Type non autorisé : ${file.type}` }, { status: 400 });
    }

    let extractedData: unknown = null;
    if (extractedRaw) {
      try { extractedData = JSON.parse(extractedRaw); }
      catch { extractedData = { raw: extractedRaw }; } // tolérant : texte brut accepté
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${company.id}/${Date.now()}_${safeName}`;
    await uploadFile("documents", storagePath, buffer, file.type);

    const docCategory = category && VALID_CATEGORIES.has(category) ? category : "OTHER";

    const [doc] = await db
      .insert(documents)
      .values({
        cabinetId,
        companyId: company.id,
        uploadedBy: createdBy,
        fileName: file.name,
        filePath: storagePath,
        fileSize: file.size,
        mimeType: file.type,
        category: docCategory as typeof documents.$inferInsert.category,
        subcategory: subcategory && subcategory.length <= 50 ? subcategory : null,
        fiscalYear: fiscalYear ? parseInt(fiscalYear, 10) || null : null,
        extractedData: extractedData ?? undefined,
        notes: notes ? `[Ingestion agent] ${notes}` : "[Ingestion agent externe]",
        status: "PENDING",
      })
      .returning();

    logAudit({
      cabinetId,
      userId: createdBy,
      action: "CREATE",
      tableName: "documents",
      recordId: doc.id,
      newData: { fileName: file.name, companyId: company.id, category: docCategory, via: "api_ingest" },
    });

    return Response.json({
      ok: true,
      document: { id: doc.id, company: company.name, category: docCategory, status: doc.status },
    }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Unauthorized") return Response.json({ error: "Clé API invalide" }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: "Scope insuffisant" }, { status: 403 });
    return Response.json({ error: "Erreur lors de l'ingestion" }, { status: 500 });
  }
}
