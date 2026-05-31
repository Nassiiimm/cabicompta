import { requireStaff } from "@/lib/auth";
import { hasCompanyAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { fiscalDeadlines } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["UPCOMING", "IN_PROGRESS", "FILED", "OVERDUE"]),
});

export async function PATCH(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStaff();
    const { id } = await segmentData.params;
    const { status } = updateSchema.parse(await request.json());

    const [existing] = await db
      .select()
      .from(fiscalDeadlines)
      .where(eq(fiscalDeadlines.id, id))
      .limit(1);

    if (!existing) {
      return Response.json({ error: "Échéance introuvable" }, { status: 404 });
    }

    if (!(await hasCompanyAccess(user, existing.companyId))) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "FILED") {
      updateData.filedAt = new Date();
    }

    const [updated] = await db
      .update(fiscalDeadlines)
      .set(updateData)
      .where(eq(fiscalDeadlines.id, id))
      .returning();

    logAudit({
      userId: user.id,
      action: "STATUS_CHANGE",
      tableName: "fiscal_deadlines",
      recordId: id,
      oldData: { status: existing.status },
      newData: { status },
    });

    return Response.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Statut invalide" }, { status: 400 });
    }
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
