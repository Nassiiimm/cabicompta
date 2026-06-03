import { requireAuth } from "@/lib/auth";
import { hasCompanyAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { invoices, invoiceItems, companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAccess } from "@/lib/access-log";

export async function GET(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await segmentData.params;

    const [invoice] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
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
        notes: invoices.notes,
        companyName: companies.name,
        companyAddress: companies.address,
        companyCity: companies.city,
        companyProvince: companies.province,
        companyPostalCode: companies.postalCode,
        companyEmail: companies.email,
        companyPhone: companies.phone,
        companyNeq: companies.neq,
        companyId: invoices.companyId,
      })
      .from(invoices)
      .leftJoin(companies, eq(invoices.companyId, companies.id))
      .where(eq(invoices.id, id))
      .limit(1);

    if (!invoice) {
      return Response.json({ error: "Facture introuvable" }, { status: 404 });
    }

    // Cloisonnement : CLIENT → sa company, INTERN → company assignée
    if (!(await hasCompanyAccess(user, invoice.companyId))) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id));

    logAccess({
      cabinetId: user.cabinetId,
      userId: user.id,
      action: "INVOICE_PDF_DOWNLOAD",
      resourceType: "invoice",
      resourceId: id,
    });

    // Generate HTML invoice for PDF rendering
    const formatCAD = (v: string | number) =>
      Number(v).toLocaleString("fr-CA", { style: "currency", currency: "CAD" });

    const formatDate = (d: Date | string | null) =>
      d ? new Date(d).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" }) : "—";

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #171717; padding: 48px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
  .logo { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  .invoice-num { font-size: 14px; font-weight: 600; text-align: right; }
  .meta { color: #737373; font-size: 12px; margin-top: 4px; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .party { max-width: 280px; }
  .party-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #a3a3a3; font-weight: 600; margin-bottom: 8px; }
  .party-name { font-weight: 600; margin-bottom: 4px; }
  .party-detail { color: #525252; font-size: 12px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #a3a3a3; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
  th:last-child, td:last-child { text-align: right; }
  td { padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
  .totals { margin-left: auto; width: 280px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .total-row.final { border-top: 2px solid #171717; margin-top: 8px; padding-top: 10px; font-weight: 700; font-size: 16px; }
  .total-label { color: #525252; }
  .rates { font-size: 11px; color: #a3a3a3; }
  .notes { margin-top: 32px; padding: 16px; background: #fafafa; border-radius: 8px; font-size: 12px; color: #525252; }
  .footer { margin-top: 64px; text-align: center; font-size: 11px; color: #a3a3a3; }
  .status { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .status-paid { background: #dcfce7; color: #166534; }
  .status-sent { background: #fef3c7; color: #92400e; }
  .status-draft { background: #f5f5f5; color: #525252; }
  .status-overdue { background: #fee2e2; color: #991b1b; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">CFC</div>
      <div class="meta">Cabinet comptable et fiscal</div>
    </div>
    <div>
      <div class="invoice-num">${invoice.invoiceNumber}</div>
      <div class="meta">
        Émise le ${formatDate(invoice.issuedAt)}<br>
        Échéance ${formatDate(invoice.dueDate)}
      </div>
      <div style="margin-top: 8px;">
        <span class="status status-${invoice.status.toLowerCase()}">${
          invoice.status === "PAID" ? "Payée" :
          invoice.status === "SENT" ? "Envoyée" :
          invoice.status === "OVERDUE" ? "En retard" :
          invoice.status === "DRAFT" ? "Brouillon" : invoice.status
        }</span>
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Facturé à</div>
      <div class="party-name">${invoice.companyName ?? "—"}</div>
      <div class="party-detail">
        ${invoice.companyAddress ?? ""}<br>
        ${[invoice.companyCity, invoice.companyProvince, invoice.companyPostalCode].filter(Boolean).join(", ")}<br>
        ${invoice.companyEmail ?? ""}<br>
        ${invoice.companyPhone ?? ""}
        ${invoice.companyNeq ? `<br>NEQ: ${invoice.companyNeq}` : ""}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qté</th>
        <th>Prix unitaire</th>
        <th>Montant</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
      <tr>
        <td>${item.description}</td>
        <td>${Number(item.quantity)}</td>
        <td>${formatCAD(item.unitPrice)}</td>
        <td>${formatCAD(item.amount)}</td>
      </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span class="total-label">Sous-total HT</span>
      <span>${formatCAD(invoice.amountHt)}</span>
    </div>
    <div class="total-row">
      <span class="total-label">TPS (${Number(invoice.tpsRate)}%)</span>
      <span>${formatCAD(invoice.tps)}</span>
    </div>
    <div class="total-row">
      <span class="total-label">TVQ (${Number(invoice.tvqRate)}%)</span>
      <span>${formatCAD(invoice.tvq)}</span>
    </div>
    <div class="total-row final">
      <span>Total TTC</span>
      <span>${formatCAD(invoice.total)}</span>
    </div>
  </div>

  ${invoice.notes ? `<div class="notes"><strong>Notes :</strong> ${invoice.notes}</div>` : ""}

  <div class="footer">
    CFC — Document généré le ${formatDate(new Date())}
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.html"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
