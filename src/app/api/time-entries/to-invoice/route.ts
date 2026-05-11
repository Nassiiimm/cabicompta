import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeEntries } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  companyId: z.string().uuid(),
  entryIds: z.array(z.string().uuid()).min(1),
  hourlyRate: z.number().min(0),
});

export async function POST(request: Request) {
  try {
    await requireStaff();

    const body = await request.json();
    const { companyId, entryIds, hourlyRate } = schema.parse(body);

    const entries = await db
      .select({
        id: timeEntries.id,
        duration: timeEntries.duration,
        description: timeEntries.description,
      })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.companyId, companyId),
          inArray(timeEntries.id, entryIds)
        )
      );

    if (entries.length === 0) {
      return Response.json(
        { error: "Aucune entrée trouvée" },
        { status: 404 }
      );
    }

    // Group by description, sum duration
    const grouped = new Map<string, number>();
    for (const entry of entries) {
      const desc = entry.description;
      grouped.set(desc, (grouped.get(desc) ?? 0) + entry.duration);
    }

    const items = Array.from(grouped.entries()).map(([description, totalMinutes]) => {
      const hours = Math.round((totalMinutes / 60) * 100) / 100;
      return {
        description,
        quantity: hours,
        unitPrice: hourlyRate,
        amount: Math.round(hours * hourlyRate * 100) / 100,
      };
    });

    return Response.json({ companyId, items });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
