import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Eye, FileText } from "lucide-react";
import { db } from "@/lib/db";
import { invoices, companies } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { InvoiceFilters } from "./invoice-filters";
import { ExportButton } from "@/components/cabinet/export-button";

function formatCAD(value: string | number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(Number(value));
}

type StatusVariant = "secondary" | "default" | "outline" | "destructive";

function statusBadge(status: string) {
  const config: Record<string, { label: string; variant: StatusVariant }> = {
    DRAFT: { label: "Brouillon", variant: "secondary" },
    SENT: { label: "Envoyee", variant: "default" },
    PAID: { label: "Payee", variant: "outline" },
    OVERDUE: { label: "En retard", variant: "destructive" },
    CANCELLED: { label: "Annulee", variant: "secondary" },
  };
  const c = config[status] || { label: status, variant: "secondary" as const };
  return (
    <Badge
      variant={c.variant}
      className={
        status === "PAID"
          ? "border-green-500 text-green-700 dark:text-green-400"
          : undefined
      }
    >
      {c.label}
    </Badge>
  );
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  let invoiceList: {
    id: string;
    invoiceNumber: string;
    total: string;
    status: string;
    dueDate: string | null;
    createdAt: Date;
    companyName: string | null;
  }[] = [];

  const validStatuses = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as const;
  const statusFilter =
    status && validStatuses.includes(status as typeof validStatuses[number])
      ? (status as typeof validStatuses[number])
      : undefined;

  try {
    const query = db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
        status: invoices.status,
        dueDate: invoices.dueDate,
        createdAt: invoices.createdAt,
        companyName: companies.name,
      })
      .from(invoices)
      .leftJoin(companies, eq(invoices.companyId, companies.id))
      .orderBy(desc(invoices.createdAt));

    if (statusFilter) {
      invoiceList = await query.where(eq(invoices.status, statusFilter));
    } else {
      invoiceList = await query;
    }
  } catch {
    // DB not connected yet
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Factures</h1>
          <p className="text-muted-foreground mt-1">
            Facturation et suivi des paiements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton href="/api/export/invoices" />
          <Link href="/invoices/new" className={buttonVariants()}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle facture
          </Link>
        </div>
      </div>

      <InvoiceFilters currentStatus={status} />

      <Card>
        <CardContent className="p-0">
          {invoiceList.length === 0 ? (
            statusFilter ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Aucun résultat pour ce filtre
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium mb-1">Aucune facture</h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                  Commencez par créer votre première facture pour suivre vos paiements.
                </p>
                <Link
                  href="/invoices/new"
                  className={buttonVariants({ size: "sm" })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer votre première facture
                </Link>
              </div>
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">N° Facture</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Total TTC
                    </th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Echeance</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceList.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3">
                        {inv.companyName || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCAD(inv.total)}
                      </td>
                      <td className="px-4 py-3">
                        {statusBadge(inv.status)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {inv.dueDate
                          ? format(new Date(inv.dueDate), "d MMM yyyy", {
                              locale: fr,
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "icon-sm",
                          })}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
