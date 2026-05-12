import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { invoices, companyMembers, companies } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PortalInvoiceList } from "@/components/portal/portal-invoice-list";

async function getInvoices(userId: string) {
  const [membership] = await db
    .select({ companyId: companyMembers.companyId })
    .from(companyMembers)
    .innerJoin(companies, eq(companyMembers.companyId, companies.id))
    .where(eq(companyMembers.userId, userId))
    .limit(1);

  if (!membership) return null;

  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      status: invoices.status,
      dueDate: invoices.dueDate,
      issuedAt: invoices.issuedAt,
    })
    .from(invoices)
    .where(eq(invoices.companyId, membership.companyId))
    .orderBy(desc(invoices.createdAt));

  return rows;
}

export default async function PortalInvoicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await getInvoices(user.id);
  if (rows === null) redirect("/portal");

  const unpaid = rows.filter((i) => i.status === "SENT" || i.status === "OVERDUE");
  const paid = rows.filter((i) => i.status === "PAID");
  const other = rows.filter((i) => !["SENT", "OVERDUE", "PAID"].includes(i.status));

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Mes factures</h1>

      {rows.length === 0 ? (
        <div className="rounded-lg border py-16 text-center">
          <p className="text-sm text-muted-foreground">Aucune facture pour l&apos;instant</p>
        </div>
      ) : (
        <>
          {unpaid.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                À payer ({unpaid.length})
              </p>
              <PortalInvoiceList invoices={unpaid} />
            </div>
          )}
          {paid.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Payées ({paid.length})
              </p>
              <PortalInvoiceList invoices={paid} />
            </div>
          )}
          {other.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Autres ({other.length})
              </p>
              <PortalInvoiceList invoices={other} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
