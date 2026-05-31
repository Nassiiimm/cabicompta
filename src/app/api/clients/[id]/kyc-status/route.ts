import { requireStaff } from "@/lib/auth";
import { hasCompanyAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const updateKycStatusSchema = z.object({
  kycVerified: z.boolean().optional(),
  conflictCheck: z.boolean().optional(),
  conflictCheckNotes: z.string().optional().nullable(),
});

export async function PATCH(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStaff();
    const { id } = await segmentData.params;

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    if (!company) {
      return Response.json(
        { error: "Client introuvable" },
        { status: 404 }
      );
    }

    if (!(await hasCompanyAccess(user, id))) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateKycStatusSchema.parse(body);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.kycVerified !== undefined) {
      updateData.kycVerified = parsed.kycVerified;
      if (parsed.kycVerified) {
        updateData.kycVerifiedAt = new Date();
      }
    }
    if (parsed.conflictCheck !== undefined) {
      updateData.conflictCheck = parsed.conflictCheck;
    }
    if (parsed.conflictCheckNotes !== undefined) {
      updateData.conflictCheckNotes = parsed.conflictCheckNotes;
    }

    const [updated] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, id))
      .returning();

    logAudit({
      userId: user.id,
      action: "UPDATE_KYC_STATUS",
      tableName: "companies",
      recordId: id,
      oldData: {
        kycVerified: company.kycVerified,
        conflictCheck: company.conflictCheck,
      },
      newData: parsed as Record<string, unknown>,
    });

    return Response.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Erreur lors de la mise à jour du statut KYC" },
      { status: 500 }
    );
  }
}
