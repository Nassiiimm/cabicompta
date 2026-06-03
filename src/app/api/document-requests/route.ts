import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentRequests, companyMembers, workflows } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const workflowId = searchParams.get("workflowId");

    if (!companyId && !workflowId) {
      return Response.json({ error: "companyId ou workflowId requis" }, { status: 400 });
    }

    // CLIENT isolation
    if (user.role === "CLIENT" && companyId) {
      const [membership] = await db
        .select({ companyId: companyMembers.companyId })
        .from(companyMembers)
        .where(
          and(
            eq(companyMembers.userId, user.id),
            eq(companyMembers.companyId, companyId)
          )
        )
        .limit(1);
      if (!membership) {
        return Response.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    const baseCondition = workflowId
      ? eq(documentRequests.workflowId, workflowId)
      : eq(documentRequests.companyId, companyId!);
    // Cloisonnement multi-tenant : toujours restreindre au cabinet de l'utilisateur
    const condition = and(baseCondition, eq(documentRequests.cabinetId, user.cabinetId));

    const rows = await db
      .select()
      .from(documentRequests)
      .where(condition)
      .orderBy(documentRequests.createdAt);

    return Response.json({ documentRequests: rows });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
