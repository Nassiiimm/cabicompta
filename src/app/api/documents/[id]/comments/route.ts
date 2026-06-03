import { db } from "@/lib/db";
import { documentComments, users, documents, companyMembers } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

// Vérifie que l'utilisateur a accès au document
async function verifyDocumentAccess(userId: string, role: string, documentId: string) {
  const [doc] = await db
    .select({ id: documents.id, companyId: documents.companyId })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) return null;

  if (role === "CLIENT") {
    const [membership] = await db
      .select({ companyId: companyMembers.companyId })
      .from(companyMembers)
      .where(
        and(
          eq(companyMembers.userId, userId),
          eq(companyMembers.companyId, doc.companyId)
        )
      )
      .limit(1);

    if (!membership) return null;
  }

  return doc;
}

export async function GET(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await segmentData.params;

    const doc = await verifyDocumentAccess(user.id, user.role, id);
    if (!doc) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const comments = await db
      .select({
        id: documentComments.id,
        message: documentComments.message,
        createdAt: documentComments.createdAt,
        userName: users.name,
        userRole: users.role,
      })
      .from(documentComments)
      .innerJoin(users, eq(documentComments.userId, users.id))
      .where(eq(documentComments.documentId, id))
      .orderBy(asc(documentComments.createdAt));

    return Response.json(comments);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const commentSchema = z.object({
  message: z.string().min(1).max(2000),
});

export async function POST(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: documentId } = await segmentData.params;

    const doc = await verifyDocumentAccess(user.id, user.role, documentId);
    if (!doc) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { message } = commentSchema.parse(body);

    const [comment] = await db
      .insert(documentComments)
      .values({ cabinetId: user.cabinetId, documentId, userId: user.id, message })
      .returning();

    return Response.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Message requis" }, { status: 400 });
    }
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
