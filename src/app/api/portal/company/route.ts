import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { companyMembers, companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const user = await requireAuth();

    const membership = await db
      .select({
        companyId: companyMembers.companyId,
        companyName: companies.name,
      })
      .from(companyMembers)
      .leftJoin(companies, eq(companyMembers.companyId, companies.id))
      .where(eq(companyMembers.userId, user.id))
      .limit(1);

    if (membership.length === 0) {
      return Response.json(
        { error: "Aucune entreprise associée" },
        { status: 404 }
      );
    }

    return Response.json({
      companyId: membership[0].companyId,
      companyName: membership[0].companyName,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
