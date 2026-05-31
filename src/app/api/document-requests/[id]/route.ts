import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentRequests, companyMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await segmentData.params;
    const body = await request.json();

    const [req] = await db
      .select()
      .from(documentRequests)
      .where(eq(documentRequests.id, id))
      .limit(1);

    if (!req) {
      return Response.json({ error: "Demande introuvable" }, { status: 404 });
    }

    // CLIENT isolation
    if (user.role === "CLIENT") {
      const [membership] = await db
        .select({ companyId: companyMembers.companyId })
        .from(companyMembers)
        .where(
          and(
            eq(companyMembers.userId, user.id),
            eq(companyMembers.companyId, req.companyId)
          )
        )
        .limit(1);
      if (!membership) {
        return Response.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    const allowed: Record<string, unknown> = {};
    if (body.status !== undefined) allowed.status = body.status;
    if (body.documentId !== undefined) allowed.documentId = body.documentId;
    allowed.updatedAt = new Date();

    const [updated] = await db
      .update(documentRequests)
      .set(allowed)
      .where(eq(documentRequests.id, id))
      .returning();

    return Response.json({ documentRequest: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
