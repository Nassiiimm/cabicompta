import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { invoices, companies } from "@/lib/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";
import { generateCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  try {
    const user = await requireStaff();
    if (user.role === "INTERN") {
      return Response.json({ error: "Accès réservé" }, { status: 403 });
    }

    const rows = await db
      .select({
        invoiceNumber: invoices.invoiceNumber,
        companyName: companies.name,
        amountHt: invoices.amountHt,
        tps: invoices.tps,
        tvq: invoices.tvq,
        total: invoices.total,
        tpsRate: invoices.tpsRate,
        tvqRate: invoices.tvqRate,
        status: invoices.status,
        issuedAt: invoices.issuedAt,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
        paymentMethod: invoices.paymentMethod,
      })
      .from(invoices)
      .leftJoin(companies, eq(invoices.companyId, companies.id))
      .where(and(eq(invoices.cabinetId, user.cabinetId), isNull(invoices.deletedAt)))
      .orderBy(desc(invoices.createdAt));

    const csv = generateCsv(
      [
        { key: "invoiceNumber", label: "Numéro" },
        { key: "companyName", label: "Client" },
        { key: "amountHt", label: "Montant HT" },
        { key: "tps", label: "TPS" },
        { key: "tvq", label: "TVQ" },
        { key: "total", label: "Total TTC" },
        { key: "tpsRate", label: "Taux TPS (%)" },
        { key: "tvqRate", label: "Taux TVQ (%)" },
        { key: "status", label: "Statut" },
        { key: "issuedAt", label: "Date émission" },
        { key: "dueDate", label: "Échéance" },
        { key: "paidAt", label: "Date paiement" },
        { key: "paymentMethod", label: "Mode de paiement" },
      ],
      rows
    );

    return csvResponse(csv, `factures-${new Date().toISOString().split("T")[0]}.csv`);
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
}
