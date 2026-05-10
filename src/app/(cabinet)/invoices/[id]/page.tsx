import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { invoices, invoiceItems, companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { InvoiceActions } from "./invoice-actions";

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

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice] = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      amountHt: invoices.amountHt,
      tps: invoices.tps,
      tvq: invoices.tvq,
      total: invoices.total,
      status: invoices.status,
      issuedAt: invoices.issuedAt,
      dueDate: invoices.dueDate,
      paidAt: invoices.paidAt,
      notes: invoices.notes,
      createdAt: invoices.createdAt,
      companyName: companies.name,
      companyAddress: companies.address,
      companyCity: companies.city,
      companyProvince: companies.province,
      companyPostalCode: companies.postalCode,
      companyEmail: companies.email,
      companyPhone: companies.phone,
    })
    .from(invoices)
    .leftJoin(companies, eq(invoices.companyId, companies.id))
    .where(eq(invoices.id, id))
    .limit(1);

  if (!invoice) {
    notFound();
  }

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id));

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/invoices"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {invoice.invoiceNumber}
              </h1>
              {statusBadge(invoice.status)}
            </div>
            <p className="text-muted-foreground mt-1">
              {invoice.companyName || "Client inconnu"}
            </p>
          </div>
        </div>
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
      </div>

      {/* Invoice document */}
      <Card>
        <CardContent className="p-8">
          {/* Header section */}
          <div className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-2xl font-bold text-primary">CabiCompta</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Cabinet comptable
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">FACTURE</p>
              <p className="text-sm font-mono text-muted-foreground">
                {invoice.invoiceNumber}
              </p>
            </div>
          </div>

          {/* Client + dates */}
          <div className="grid sm:grid-cols-2 gap-8 mb-10">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Facturer a
              </p>
              <p className="font-medium text-lg">
                {invoice.companyName || "—"}
              </p>
              {invoice.companyAddress && (
                <p className="text-sm text-muted-foreground">
                  {invoice.companyAddress}
                </p>
              )}
              {(invoice.companyCity || invoice.companyProvince) && (
                <p className="text-sm text-muted-foreground">
                  {[invoice.companyCity, invoice.companyProvince]
                    .filter(Boolean)
                    .join(", ")}{" "}
                  {invoice.companyPostalCode}
                </p>
              )}
              {invoice.companyEmail && (
                <p className="text-sm text-muted-foreground mt-1">
                  {invoice.companyEmail}
                </p>
              )}
              {invoice.companyPhone && (
                <p className="text-sm text-muted-foreground">
                  {invoice.companyPhone}
                </p>
              )}
            </div>
            <div className="sm:text-right space-y-1">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date d&apos;emission
                </p>
                <p className="text-sm">
                  {invoice.issuedAt
                    ? format(new Date(invoice.issuedAt), "d MMMM yyyy", {
                        locale: fr,
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-3">
                  Date d&apos;echeance
                </p>
                <p className="text-sm">
                  {invoice.dueDate
                    ? format(new Date(invoice.dueDate), "d MMMM yyyy", {
                        locale: fr,
                      })
                    : "—"}
                </p>
              </div>
              {invoice.paidAt && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-3">
                    Date de paiement
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {format(new Date(invoice.paidAt), "d MMMM yyyy", {
                      locale: fr,
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-foreground/20 text-left">
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium text-right">Quantite</th>
                  <th className="pb-3 font-medium text-right">Prix unit.</th>
                  <th className="pb-3 font-medium text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3">{item.description}</td>
                    <td className="py-3 text-right">{Number(item.quantity)}</td>
                    <td className="py-3 text-right">
                      {formatCAD(item.unitPrice)}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {formatCAD(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total HT</span>
                <span>{formatCAD(invoice.amountHt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TPS (5 %)</span>
                <span>{formatCAD(invoice.tps)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVQ (9,975 %)</span>
                <span>{formatCAD(invoice.tvq)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t-2 pt-2">
                <span>Total TTC</span>
                <span>{formatCAD(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-10 pt-6 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Notes
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {invoice.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
