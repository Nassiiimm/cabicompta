import Link from "next/link";
import { db } from "@/lib/db";
import {
  companies,
  documents,
  invoices,
  fiscalDeadlines,
} from "@/lib/db/schema";
import { count, eq, sql, desc } from "drizzle-orm";
import { ArrowRight } from "lucide-react";

async function getStats() {
  const [clients] = await db.select({ v: count() }).from(companies).where(eq(companies.status, "ACTIVE"));
  const [docs] = await db.select({ v: count() }).from(documents).where(eq(documents.status, "PENDING"));
  const [inv] = await db.select({ v: count() }).from(invoices).where(sql`${invoices.status} IN ('SENT', 'OVERDUE')`);
  const [deadlines] = await db.select({ v: count() }).from(fiscalDeadlines).where(eq(fiscalDeadlines.status, "UPCOMING"));

  const recentDocs = await db
    .select({
      id: documents.id,
      fileName: documents.fileName,
      status: documents.status,
      createdAt: documents.createdAt,
      companyName: companies.name,
    })
    .from(documents)
    .leftJoin(companies, eq(documents.companyId, companies.id))
    .orderBy(desc(documents.createdAt))
    .limit(5);

  const upcomingDeadlines = await db
    .select({
      id: fiscalDeadlines.id,
      label: fiscalDeadlines.label,
      dueDate: fiscalDeadlines.dueDate,
      companyName: companies.name,
    })
    .from(fiscalDeadlines)
    .innerJoin(companies, eq(fiscalDeadlines.companyId, companies.id))
    .where(eq(fiscalDeadlines.status, "UPCOMING"))
    .orderBy(fiscalDeadlines.dueDate)
    .limit(5);

  return {
    activeClients: clients?.v ?? 0,
    pendingDocs: docs?.v ?? 0,
    unpaidInvoices: inv?.v ?? 0,
    upcomingDeadlines: deadlines?.v ?? 0,
    recentDocs,
    nextDeadlines: upcomingDeadlines,
  };
}

export default async function DashboardPage() {
  const data = await getStats();

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-lg font-semibold">Tableau de bord</h1>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Clients", value: data.activeClients, href: "/clients" },
          { label: "Docs en attente", value: data.pendingDocs, href: "/documents" },
          { label: "Factures impayées", value: data.unpaidInvoices, href: "/invoices" },
          { label: "Échéances", value: data.upcomingDeadlines, href: "/clients" },
        ].map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className="rounded-lg border p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
          >
            <p className="text-2xl font-bold tracking-tight">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent docs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Documents récents</h2>
            <Link href="/documents" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              Voir tout <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="rounded-lg border divide-y">
            {data.recentDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">Aucun document</p>
            ) : (
              data.recentDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">{doc.companyName}</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    doc.status === "PROCESSED"
                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                  }`}>
                    {doc.status === "PROCESSED" ? "Traité" : "En attente"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming deadlines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Prochaines échéances</h2>
          </div>
          <div className="rounded-lg border divide-y">
            {data.nextDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">Aucune échéance</p>
            ) : (
              data.nextDeadlines.map((d) => {
                const days = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000);
                return (
                  <div key={d.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.label}</p>
                      <p className="text-xs text-muted-foreground">{d.companyName}</p>
                    </div>
                    <span className={`text-[11px] font-medium whitespace-nowrap ${
                      days <= 7 ? "text-red-600" : days <= 14 ? "text-amber-600" : "text-muted-foreground"
                    }`}>
                      {days <= 0 ? "Aujourd'hui" : `${days}j`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
