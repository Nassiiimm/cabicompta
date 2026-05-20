import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  documents,
  companyMembers,
  invoices,
  companies,
  fiscalDeadlines,
} from "@/lib/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { PortalUploadZone } from "@/components/portal/portal-upload-zone";
import { PortalDocumentList } from "@/components/portal/portal-document-list";
import { PortalInvoiceList } from "@/components/portal/portal-invoice-list";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

async function getPortalData(userId: string) {
  const membership = await db
    .select({ companyId: companyMembers.companyId, companyName: companies.name })
    .from(companyMembers)
    .innerJoin(companies, eq(companyMembers.companyId, companies.id))
    .where(eq(companyMembers.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;
  const { companyId, companyName } = membership[0];

  const [docCount] = await db
    .select({ total: count(), pending: sql<number>`count(*) filter (where ${documents.status} = 'PENDING')` })
    .from(documents)
    .where(eq(documents.companyId, companyId));

  const docList = await db
    .select({ id: documents.id, fileName: documents.fileName, fileSize: documents.fileSize, category: documents.category, status: documents.status, createdAt: documents.createdAt })
    .from(documents)
    .where(eq(documents.companyId, companyId))
    .orderBy(desc(documents.createdAt))
    .limit(10);

  const invoiceList = await db
    .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, total: invoices.total, status: invoices.status, dueDate: invoices.dueDate, issuedAt: invoices.issuedAt })
    .from(invoices)
    .where(eq(invoices.companyId, companyId))
    .orderBy(desc(invoices.createdAt))
    .limit(10);

  const deadlines = await db
    .select({ id: fiscalDeadlines.id, label: fiscalDeadlines.label, dueDate: fiscalDeadlines.dueDate })
    .from(fiscalDeadlines)
    .where(and(eq(fiscalDeadlines.companyId, companyId), eq(fiscalDeadlines.status, "UPCOMING")))
    .orderBy(fiscalDeadlines.dueDate)
    .limit(3);

  const total = docCount?.total ?? 0;
  const pending = Number(docCount?.pending ?? 0);
  const processed = total - pending;
  const completionRate = total > 0 ? Math.round((processed / total) * 100) : 0;
  const unpaidInvoices = invoiceList.filter((i) => i.status === "SENT" || i.status === "OVERDUE");

  return { companyId, companyName, totalDocs: total, pendingDocs: pending, completionRate, documents: docList, invoices: invoiceList, unpaidInvoices, deadlines };
}

export default async function PortalPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [data, t, tc] = await Promise.all([
    getPortalData(user.id),
    getTranslations("portal.home"),
    getTranslations("common"),
  ]);

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">
          Votre compte n&apos;est pas encore associé à une entreprise.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold">
          {user.name ? `${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">{data.companyName}</p>
      </div>

      {/* Alerts */}
      {data.unpaidInvoices.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-4">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
            {data.unpaidInvoices.length} facture{data.unpaidInvoices.length > 1 ? "s" : ""} en attente de paiement
          </p>
          {data.unpaidInvoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between text-sm py-1">
              <span className="text-amber-800 dark:text-amber-300">{inv.invoiceNumber}</span>
              <span className="font-semibold text-amber-900 dark:text-amber-200">
                {Number(inv.total).toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Deadlines + progress */}
      {(data.deadlines.length > 0 || data.totalDocs > 0) && (
        <div className="rounded-lg border p-4 space-y-3">
          {data.deadlines.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("deadlinesTitle")}</p>
              {data.deadlines.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm py-1">
                  <span>{d.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(d.dueDate).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
          {data.totalDocs > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Dossier complété</span>
                <span>{data.completionRate} %</span>
              </div>
              <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all" style={{ width: `${data.completionRate}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">{t("uploadTitle")}</p>
        <PortalUploadZone companyId={data.companyId} />
      </div>

      {/* Invoices */}
      {data.invoices.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Factures</p>
          <PortalInvoiceList invoices={data.invoices} />
        </div>
      )}

      {/* Documents */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">Documents ({data.totalDocs})</p>
          {data.totalDocs > 0 && (
            <Link href="/portal/documents" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              {tc("viewAll")} <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
        {data.documents.length > 0 ? (
          <PortalDocumentList documents={data.documents} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">{t("noDocs")}</p>
        )}
      </div>
    </div>
  );
}
