import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { kycDocuments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStaff();
    const { id } = await segmentData.params;

    const [existing] = await db
      .select()
      .from(kycDocuments)
      .where(eq(kycDocuments.id, id))
      .limit(1);

    if (!existing) {
      return Response.json(
        { error: "Document KYC introuvable" },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(kycDocuments)
      .set({
        verified: true,
        verifiedBy: user.id,
        verifiedAt: new Date(),
      })
      .where(eq(kycDocuments.id, id))
      .returning();

    return Response.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json(
      { error: "Erreur lors de la vérification du document KYC" },
      { status: 500 }
    );
  }
}
