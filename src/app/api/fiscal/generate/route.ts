import { db } from "@/lib/db";
import { companies, fiscalDeadlines } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { hasCompanyAccess } from "@/lib/authz";
import { generateFiscalDeadlines } from "@/lib/fiscal-calendar";

export async function POST(request: Request) {
  try {
    const user = await requireStaff();

    const { companyId, year } = await request.json();
    if (!companyId || !year) {
      return Response.json(
        { error: "companyId and year are required" },
        { status: 400 }
      );
    }

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    if (!(await hasCompanyAccess(user, companyId))) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    if (!company.fiscalYearEnd) {
      return Response.json(
        { error: "La date de fin d'exercice fiscal n'est pas définie pour cette société" },
        { status: 400 }
      );
    }

    const deadlines = generateFiscalDeadlines(company.fiscalYearEnd, year, company.type);

    let inserted = 0;
    for (const d of deadlines) {
      // Check if this exact deadline already exists
      const existing = await db
        .select({ id: fiscalDeadlines.id })
        .from(fiscalDeadlines)
        .where(
          and(
            eq(fiscalDeadlines.companyId, companyId),
            eq(fiscalDeadlines.type, d.type as typeof fiscalDeadlines.type.enumValues[number]),
            eq(fiscalDeadlines.period, d.period)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(fiscalDeadlines).values({
          cabinetId: user.cabinetId,
          companyId,
          type: d.type as typeof fiscalDeadlines.type.enumValues[number],
          label: d.label,
          period: d.period,
          dueDate: d.dueDate.toISOString().split("T")[0],
          status: "UPCOMING",
          notes: d.description,
        });
        inserted++;
      }
    }

    return Response.json({
      generated: deadlines.length,
      inserted,
      skipped: deadlines.length - inserted,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
