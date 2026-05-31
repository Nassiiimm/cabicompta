import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { invoices, companyMembers, companies } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { PortalInvoiceList } from "@/components/portal/portal-invoice-list";

async function getInvoicesData(userId: string) {
  const membership = await db
    .select({ companyId: companyMembers.companyId })
    .from(companyMembers)
    .where(eq(companyMembers.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;
  const { companyId } = membership[0];

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
    .where(eq(invoices.companyId, companyId))
    .orderBy(desc(invoices.issuedAt))
    .limit(50);

  return rows;
}

export default async function PortalInvoicesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const invoiceList = await getInvoicesData(user.id);

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-muted-foreground">Vos factures</p>

      {!invoiceList || invoiceList.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">Aucune facture pour le moment.</p>
        </div>
      ) : (
        <PortalInvoiceList
          invoices={invoiceList.map((inv) => ({
            ...inv,
            total: String(inv.total),
            dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : null,
          }))}
        />
      )}
    </div>
  );
}
