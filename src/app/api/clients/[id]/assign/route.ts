import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  staffId: z.string().uuid().nullable(),
});

export async function PATCH(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await segmentData.params;
    const { staffId } = schema.parse(await request.json());

    // Verify staff user exists and is ADMIN or STAFF
    if (staffId) {
      const [staff] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, staffId))
        .limit(1);

      if (!staff || staff.role === "CLIENT") {
        return Response.json({ error: "Utilisateur invalide" }, { status: 400 });
      }
    }

    const [updated] = await db
      .update(companies)
      .set({ assignedTo: staffId, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning({ id: companies.id, assignedTo: companies.assignedTo });

    if (!updated) {
      return Response.json({ error: "Société introuvable" }, { status: 404 });
    }

    return Response.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
