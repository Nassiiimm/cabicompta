import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { sql, and, isNull } from "drizzle-orm";

const MONTH_NAMES = [
  "jan", "fév", "mar", "avr", "mai", "jun",
  "jul", "aoû", "sep", "oct", "nov", "déc",
];

export async function GET() {
  try {
    await requireStaff();

    const now = new Date();
    const months: { month: string; facture: number; encaisse: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1; // 1-based
      const label = MONTH_NAMES[d.getMonth()];

      const [facture] = await db
        .select({
          v: sql<string>`coalesce(sum(${invoices.total}), 0)`,
        })
        .from(invoices)
        .where(
          and(
            sql`${invoices.status} != 'DRAFT'`,
            isNull(invoices.deletedAt),
            sql`extract(year from ${invoices.createdAt}) = ${year}`,
            sql`extract(month from ${invoices.createdAt}) = ${month}`
          )
        );

      const [encaisse] = await db
        .select({
          v: sql<string>`coalesce(sum(${invoices.total}), 0)`,
        })
        .from(invoices)
        .where(
          and(
            sql`${invoices.status} = 'PAID'`,
            isNull(invoices.deletedAt),
            sql`extract(year from ${invoices.createdAt}) = ${year}`,
            sql`extract(month from ${invoices.createdAt}) = ${month}`
          )
        );

      months.push({
        month: label,
        facture: parseFloat(facture?.v ?? "0"),
        encaisse: parseFloat(encaisse?.v ?? "0"),
      });
    }

    return Response.json({ data: months });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json(
      { error: "Erreur lors du chargement des revenus" },
      { status: 500 }
    );
  }
}
