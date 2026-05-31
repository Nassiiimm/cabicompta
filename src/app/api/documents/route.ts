import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  documents,
  companies,
  users,
  companyMembers,
} from "@/lib/db/schema";
import { eq, desc, and, isNull, count } from "drizzle-orm";
import { requireAuth, requireStaff } from "@/lib/auth";
import { uploadFile } from "@/lib/supabase/storage";
import { rateLimitByIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { csrfGuard } from "@/lib/csrf";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    // CLIENT users can only see their own company's documents
    if (user.role === "CLIENT") {
      // Find the client's company
      const membership = await db
        .select({ companyId: companyMembers.companyId })
        .from(companyMembers)
        .where(eq(companyMembers.userId, user.id))
        .limit(1);

      if (membership.length === 0) {
        return Response.json({ documents: [] });
      }

      const clientCompanyId = membership[0].companyId;

      const docs = await db
        .select({
          id: documents.id,
          fileName: documents.fileName,
          filePath: documents.filePath,
          fileSize: documents.fileSize,
          mimeType: documents.mimeType,
          category: documents.category,
          fiscalYear: documents.fiscalYear,
          status: documents.status,
          notes: documents.notes,
          extractedData: documents.extractedData,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
          companyName: companies.name,
          uploaderName: users.name,
        })
        .from(documents)
        .leftJoin(companies, eq(documents.companyId, companies.id))
        .leftJoin(users, eq(documents.uploadedBy, users.id))
        .where(and(eq(documents.companyId, clientCompanyId), isNull(documents.deletedAt)))
        .orderBy(desc(documents.createdAt));

      return Response.json({ documents: docs });
    }

    // STAFF / ADMIN / INTERN
    await requireStaff();

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
    const offset = (page - 1) * limit;

    let conditions = companyId
      ? and(eq(documents.companyId, companyId), isNull(documents.deletedAt))
      : isNull(documents.deletedAt);

    // INTERN : seulement les documents des clients qui lui sont assignés
    if (user.role === "INTERN") {
      conditions = and(conditions, eq(companies.assignedTo, user.id));
    }

    const [totalResult] = await db
      .select({ total: count() })
      .from(documents)
      .where(conditions);

    const docs = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        filePath: documents.filePath,
        fileSize: documents.fileSize,
        mimeType: documents.mimeType,
        category: documents.category,
        subcategory: documents.subcategory,
        fiscalYear: documents.fiscalYear,
        status: documents.status,
        notes: documents.notes,
        extractedData: documents.extractedData,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        companyName: companies.name,
        uploaderName: users.name,
      })
      .from(documents)
      .leftJoin(companies, eq(documents.companyId, companies.id))
      .leftJoin(users, eq(documents.uploadedBy, users.id))
      .where(conditions)
      .orderBy(desc(documents.createdAt))
      .limit(limit)
      .offset(offset);

    return Response.json({
      documents: docs,
      total: totalResult?.total ?? 0,
      page,
      limit,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }
    console.error("GET /api/documents error:", error);
    return Response.json(
      { error: "Erreur lors du chargement des documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrf = csrfGuard(request);
    if (csrf) return csrf;
    if (!rateLimitByIp(request, 20, 60000)) {
      return Response.json({ error: "Trop de requêtes" }, { status: 429 });
    }
    const user = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const companyId = formData.get("companyId") as string | null;
    const category = formData.get("category") as string | null;
    const subcategory = formData.get("subcategory") as string | null;
    const fiscalYear = formData.get("fiscalYear") as string | null;

    if (!file) {
      return Response.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }
    if (!companyId) {
      return Response.json(
        { error: "L'entreprise est requise" },
        { status: 400 }
      );
    }

    // CLIENT users can only upload to their own company
    if (user.role === "CLIENT") {
      const membership = await db
        .select({ companyId: companyMembers.companyId })
        .from(companyMembers)
        .where(
          and(
            eq(companyMembers.userId, user.id),
            eq(companyMembers.companyId, companyId)
          )
        )
        .limit(1);

      if (membership.length === 0) {
        return Response.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    // INTERN : seulement les clients qui lui sont assignés
    if (user.role === "INTERN") {
      const [company] = await db
        .select({ assignedTo: companies.assignedTo })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      if (!company || company.assignedTo !== user.id) {
        return Response.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    // Validate file size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      return Response.json(
        { error: "Le fichier dépasse 10 Mo" },
        { status: 400 }
      );
    }

    // Whitelist MIME types — seuls les types documentaires sont acceptés
    const ALLOWED_MIME_TYPES = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/tiff",
      "image/heic",
      "image/heif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
    ]);

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return Response.json(
        { error: "Type de fichier non autorisé. Formats acceptés : PDF, images, Word, Excel, CSV." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${companyId}/${timestamp}_${safeName}`;

    await uploadFile("documents", storagePath, buffer, file.type);

    const validCategories = [
      "DAS", "TPS_TVQ", "FINANCIAL_STATEMENT", "T1", "REQ_DOC", "IMMOBILISATION",
      "BANK_STATEMENT", "INVOICE", "TAX_NOTICE", "CORPORATE", "CONTRACT", "RECEIPT", "OTHER",
    ];
    const docCategory =
      category && validCategories.includes(category) ? category : "OTHER";
    const docSubcategory =
      subcategory && typeof subcategory === "string" && subcategory.length <= 50
        ? subcategory.trim() || null
        : null;

    const [doc] = await db
      .insert(documents)
      .values({
        companyId,
        uploadedBy: user.id,
        fileName: file.name,
        filePath: storagePath,
        fileSize: file.size,
        mimeType: file.type,
        category: docCategory as typeof documents.$inferInsert.category,
        subcategory: docSubcategory,
        fiscalYear: fiscalYear ? parseInt(fiscalYear, 10) : null,
        status: "PENDING",
      })
      .returning();

    logAudit({
      userId: user.id,
      action: "CREATE",
      tableName: "documents",
      recordId: doc.id,
      newData: { fileName: file.name, companyId, category: docCategory },
    });

    return Response.json({ document: doc }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }
    console.error("POST /api/documents error:", error);
    return Response.json(
      { error: "Erreur lors du téléversement" },
      { status: 500 }
    );
  }
}
