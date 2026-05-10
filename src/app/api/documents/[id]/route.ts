import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { documents, companyMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireStaff } from "@/lib/auth";
import { getSignedUrl, deleteFile } from "@/lib/supabase/storage";
import { logAccess } from "@/lib/access-log";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (!doc) {
      return Response.json({ error: "Document introuvable" }, { status: 404 });
    }

    // CLIENT can only access their own company's documents
    if (user.role === "CLIENT") {
      const membership = await db
        .select({ companyId: companyMembers.companyId })
        .from(companyMembers)
        .where(
          and(
            eq(companyMembers.userId, user.id),
            eq(companyMembers.companyId, doc.companyId)
          )
        )
        .limit(1);

      if (membership.length === 0) {
        return Response.json({ error: "Accès refusé" }, { status: 403 });
      }
    } else {
      await requireStaff();
    }

    const signedUrl = await getSignedUrl("documents", doc.filePath);

    // Loi 25 — journal d'accès aux documents confidentiels
    logAccess({
      userId: user.id,
      action: "DOCUMENT_DOWNLOAD",
      resourceType: "document",
      resourceId: doc.id,
    });

    return Response.json({ document: doc, downloadUrl: signedUrl });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }
    console.error("GET /api/documents/[id] error:", error);
    return Response.json(
      { error: "Erreur lors du chargement du document" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireStaff();
    const { id } = await context.params;

    const body = await request.json();
    const { category, status, notes } = body;

    const [existing] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (!existing) {
      return Response.json({ error: "Document introuvable" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    const validCategories = [
      "BANK_STATEMENT",
      "INVOICE",
      "TAX_NOTICE",
      "FINANCIAL_STATEMENT",
      "TPS_TVQ",
      "CORPORATE",
      "CONTRACT",
      "RECEIPT",
      "OTHER",
    ];
    if (category && validCategories.includes(category)) {
      updateData.category = category;
    }

    const validStatuses = ["PENDING", "PROCESSED", "REJECTED"];
    if (status && validStatuses.includes(status)) {
      updateData.status = status;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const [updated] = await db
      .update(documents)
      .set(updateData)
      .where(eq(documents.id, id))
      .returning();

    return Response.json({ document: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }
    console.error("PATCH /api/documents/[id] error:", error);
    return Response.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}

// Soft delete — le fichier reste dans Storage, la trace reste en DB
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireStaff();
    const { id } = await context.params;

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (!doc) {
      return Response.json({ error: "Document introuvable" }, { status: 404 });
    }

    await db
      .update(documents)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(documents.id, id));

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }
    console.error("DELETE /api/documents/[id] error:", error);
    return Response.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
