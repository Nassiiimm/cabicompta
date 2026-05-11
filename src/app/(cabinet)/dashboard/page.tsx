import Link from "next/link";
import { db } from "@/lib/db";
import {
  companies,
  documents,
  invoices,
  fiscalDeadlines,
} from "@/lib/db/schema";
import { count, eq, sql, desc, and, lte, isNull } from "drizzle-orm";
import { ArrowRight, CheckCircle2, AlertTriangle, FileText, CalendarClock, Receipt } from "lucide-react";
import { RevenueChart } from "@/components/cabinet/revenue-chart";

async function getStats() {
  const today = new Date();
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const [clients] = await db.select({ v: count() }).from(companies).where(eq(companies.status, "ACTIVE"));
  const [pendingDocsResult] = await db.select({ v: count() }).from(documents).where(eq(documents.status, "PENDING"));
  const [overdueInvoicesResult] = await db.select({ v: count() }).from(invoices).where(eq(invoices.status, "OVERDUE"));
  const [unpaidInvoicesResult] = await db.select({ v: count() }).from(invoices).where(sql`${invoices.status} IN ('SENT', 'OVERDUE')`);
  const [allDeadlines] = await db.select({ v: count() }).from(fiscalDeadlines).where(eq(fiscalDeadlines.status, "UPCOMING"));

  // Deadlines this week
  const weekDeadlines = await db
    .select({ v: count() })
    .from(fiscalDeadlines)
    .where(
      and(
        eq(fiscalDeadlines.status, "UPCOMING"),
        lte(fiscalDeadlines.dueDate, in7Days.toISOString().split("T")[0])
      )
    );
  const weekDeadlineCount = weekDeadlines[0]?.v ?? 0;

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

  // Revenue chart data — last 6 months
  const MONTH_NAMES = ["jan", "fev", "mar", "avr", "mai", "jun", "jul", "aou", "sep", "oct", "nov", "dec"];
  const revenueData: { month: string; facture: number; encaisse: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const label = MONTH_NAMES[d.getMonth()];

    const [facture] = await db
      .select({ v: sql<string>`coalesce(sum(${invoices.total}), 0)` })
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
      .select({ v: sql<string>`coalesce(sum(${invoices.total}), 0)` })
      .from(invoices)
      .where(
        and(
          sql`${invoices.status} = 'PAID'`,
          isNull(invoices.deletedAt),
          sql`extract(year from ${invoices.createdAt}) = ${year}`,
          sql`extract(month from ${invoices.createdAt}) = ${month}`
        )
      );

    revenueData.push({
      month: label,
      facture: parseFloat(facture?.v ?? "0"),
      encaisse: parseFloat(encaisse?.v ?? "0"),
    });
  }

  return {
    activeClients: clients?.v ?? 0,
    pendingDocs: pendingDocsResult?.v ?? 0,
    overdueInvoices: overdueInvoicesResult?.v ?? 0,
    unpaidInvoices: unpaidInvoicesResult?.v ?? 0,
    upcomingDeadlines: allDeadlines?.v ?? 0,
    weekDeadlineCount,
    recentDocs,
    nextDeadlines: upcomingDeadlines,
    revenueData,
  };
}

export default async function DashboardPage() {
  const data = await getStats();

  const todoItems = [
    {
      count: data.weekDeadlineCount,
      label: `échéance${data.weekDeadlineCount > 1 ? "s" : ""} cette semaine`,
      href: "/clients",
      icon: CalendarClock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    {
      count: data.pendingDocs,
      label: `document${data.pendingDocs > 1 ? "s" : ""} à traiter`,
      href: "/documents",
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      count: data.overdueInvoices,
      label: `facture${data.overdueInvoices > 1 ? "s" : ""} en retard`,
      href: "/invoices",
      icon: Receipt,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950",
    },
  ].filter((item) => item.count > 0);

  const allClear = todoItems.length === 0;

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-lg font-semibold">Tableau de bord</h1>

      {/* A faire aujourd'hui */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="size-4" />
          À faire aujourd&apos;hui
        </h2>
        {allClear ? (
          <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 p-4 flex items-center gap-3">
            <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Tout est à jour
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {todoItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg border p-4 ${item.bg} hover:opacity-80 transition-opacity flex items-center gap-3`}
              >
                <item.icon className={`size-5 shrink-0 ${item.color}`} />
                <div>
                  <p className={`text-xl font-bold ${item.color}`}>{item.count}</p>
                  <p className={`text-xs font-medium ${item.color}`}>{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Clients actifs", value: data.activeClients, href: "/clients" },
          { label: "Docs en attente", value: data.pendingDocs, href: "/documents" },
          { label: "Factures impayées", value: data.unpaidInvoices, href: "/invoices" },
          { label: "Échéances à venir", value: data.upcomingDeadlines, href: "/clients" },
        ].map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className="rounded-lg border p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
          >
            <p className="text-lg font-bold tracking-tight">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </Link>
        ))}
      </div>

      {/* Revenue Chart */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Revenus — 6 derniers mois</h2>
        <div className="rounded-lg border p-4">
          <RevenueChart data={data.revenueData} />
        </div>
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
