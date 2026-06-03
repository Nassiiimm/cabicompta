import { db } from "@/lib/db";
import { timeEntries, companies, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const user = await requireStaff();
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId");

    const condition = companyId
      ? and(eq(timeEntries.userId, user.id), eq(timeEntries.companyId, companyId))
      : eq(timeEntries.userId, user.id);

    const entries = await db
      .select({
        id: timeEntries.id,
        duration: timeEntries.duration,
        description: timeEntries.description,
        date: timeEntries.date,
        billable: timeEntries.billable,
        companyName: companies.name,
        companyId: timeEntries.companyId,
      })
      .from(timeEntries)
      .innerJoin(companies, eq(timeEntries.companyId, companies.id))
      .where(condition)
      .orderBy(desc(timeEntries.date))
      .limit(50);

    // Total minutes
    const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);

    return Response.json({ entries, totalMinutes });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const createSchema = z.object({
  companyId: z.string().uuid(),
  duration: z.number().int().min(1).max(1440),
  description: z.string().min(1),
  date: z.string(),
  billable: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const user = await requireStaff();
    const body = await request.json();
    const data = createSchema.parse(body);

    const [entry] = await db
      .insert(timeEntries)
      .values({
        cabinetId: user.cabinetId,
        userId: user.id,
        companyId: data.companyId,
        duration: data.duration,
        description: data.description,
        date: data.date,
        billable: data.billable,
      })
      .returning();

    return Response.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Données invalides" }, { status: 400 });
    }
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
