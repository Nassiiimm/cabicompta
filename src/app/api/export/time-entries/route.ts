import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeEntries, companies, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  try {
    await requireStaff();

    const rows = await db
      .select({
        date: timeEntries.date,
        staffName: users.name,
        staffEmail: users.email,
        companyName: companies.name,
        duration: timeEntries.duration,
        description: timeEntries.description,
        billable: timeEntries.billable,
      })
      .from(timeEntries)
      .innerJoin(users, eq(timeEntries.userId, users.id))
      .innerJoin(companies, eq(timeEntries.companyId, companies.id))
      .orderBy(desc(timeEntries.date))
      .limit(5000);

    const formatted = rows.map((r) => ({
      ...r,
      hours: (r.duration / 60).toFixed(2),
      billable: r.billable ? "Oui" : "Non",
    }));

    const csv = generateCsv(
      [
        { key: "date", label: "Date" },
        { key: "staffName", label: "Comptable" },
        { key: "companyName", label: "Client" },
        { key: "hours", label: "Heures" },
        { key: "duration", label: "Minutes" },
        { key: "description", label: "Description" },
        { key: "billable", label: "Facturable" },
      ],
      formatted
    );

    return csvResponse(csv, `feuilles-de-temps-${new Date().toISOString().split("T")[0]}.csv`);
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
}
