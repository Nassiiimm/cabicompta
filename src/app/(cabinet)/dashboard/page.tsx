import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import {
  companies,
  documents,
  invoices,
  fiscalDeadlines,
  workflowTasks,
  workflows,
  documentRequests,
} from "@/lib/db/schema";
import { count, eq, sql, desc, and, lte, isNull, gte, lt, isNotNull } from "drizzle-orm";
import { ArrowRight, CheckCircle2, AlertTriangle, FileText, CalendarClock, Receipt, GitBranch, Zap } from "lucide-react";
import { RevenueChart } from "@/components/cabinet/revenue-chart";

async function getStats(userId: string) {
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split("T")[0];
  const in7Days = new Date(todayDate);
  in7Days.setDate(in7Days.getDate() + 7);

  const in7DaysStr = in7Days.toISOString().split("T")[0];
  const sixMonthsAgo = new Date(todayDate.getFullYear(), todayDate.getMonth() - 5, 1);

  // Toutes ces requêtes sont indépendantes → exécutées EN PARALLÈLE.
  // (auparavant en série : ~10 allers-retours additionnés vers Supabase ca-central-1)
  const [
    [clients],
    [pendingDocRequestsResult],
    [pendingDocsResult],
    [overdueInvoicesResult],
    [unpaidInvoicesResult],
    [allDeadlines],
    [weekDeadlinesResult],
    [overdueTasksResult],
    recentDocs,
    upcomingDeadlines,
    revenueRows,
  ] = await Promise.all([
    db.select({ v: count() }).from(companies).where(eq(companies.status, "ACTIVE")),
    db.select({ v: count() }).from(documentRequests).where(eq(documentRequests.status, "PENDING")),
    db.select({ v: count() }).from(documents).where(eq(documents.status, "PENDING")),
    db.select({ v: count() }).from(invoices).where(eq(invoices.status, "OVERDUE")),
    db.select({ v: count() }).from(invoices).where(sql`${invoices.status} IN ('SENT', 'OVERDUE')`),
    db.select({ v: count() }).from(fiscalDeadlines).where(eq(fiscalDeadlines.status, "UPCOMING")),
    db
      .select({ v: count() })
      .from(fiscalDeadlines)
      .where(and(eq(fiscalDeadlines.status, "UPCOMING"), lte(fiscalDeadlines.dueDate, in7DaysStr))),
    db
      .select({ v: sql<number>`count(*)::int` })
      .from(workflowTasks)
      .innerJoin(workflows, eq(workflowTasks.workflowId, workflows.id))
      .where(
        and(
          eq(workflowTasks.assignedTo, userId),
          isNotNull(workflowTasks.dueDate),
          lt(workflowTasks.dueDate, todayStr),
          sql`${workflowTasks.status} NOT IN ('DONE', 'SKIPPED')`,
          sql`${workflows.status} != 'CANCELLED'`
        )
      ),
    db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        status: documents.status,
        createdAt: documents.createdAt,
        companyName: companies.name,
        companyId: documents.companyId,
      })
      .from(documents)
      .leftJoin(companies, eq(documents.companyId, companies.id))
      .orderBy(desc(documents.createdAt))
      .limit(5),
    db
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
      .limit(5),
    db
      .select({
        year: sql<number>`extract(year from ${invoices.issuedAt})::int`,
        month: sql<number>`extract(month from ${invoices.issuedAt})::int`,
        facture: sql<string>`coalesce(sum(${invoices.total}) filter (where ${invoices.status} != 'DRAFT'), 0)`,
        encaisse: sql<string>`coalesce(sum(${invoices.total}) filter (where ${invoices.status} = 'PAID'), 0)`,
      })
      .from(invoices)
      .where(and(isNull(invoices.deletedAt), gte(invoices.issuedAt, sixMonthsAgo)))
      .groupBy(
        sql`extract(year from ${invoices.issuedAt})`,
        sql`extract(month from ${invoices.issuedAt})`
      )
      .orderBy(
        sql`extract(year from ${invoices.issuedAt})`,
        sql`extract(month from ${invoices.issuedAt})`
      ),
  ]);

  const weekDeadlineCount = weekDeadlinesResult?.v ?? 0;
  const MONTH_NAMES = ["jan", "fev", "mar", "avr", "mai", "jun", "jul", "aou", "sep", "oct", "nov", "dec"];

  const revenueMap = new Map(
    revenueRows.map((r) => [`${r.year}-${r.month}`, r])
  );

  const revenueData: { month: string; facture: number; encaisse: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const row = revenueMap.get(key);
    revenueData.push({
      month: MONTH_NAMES[d.getMonth()],
      facture: parseFloat(row?.facture ?? "0"),
      encaisse: parseFloat(row?.encaisse ?? "0"),
    });
  }

  return {
    activeClients: clients?.v ?? 0,
    pendingDocs: pendingDocsResult?.v ?? 0,
    overdueInvoices: overdueInvoicesResult?.v ?? 0,
    unpaidInvoices: unpaidInvoicesResult?.v ?? 0,
    upcomingDeadlines: allDeadlines?.v ?? 0,
    weekDeadlineCount,
    overdueMyTasks: overdueTasksResult?.v ?? 0,
    pendingDocRequests: pendingDocRequestsResult?.v ?? 0,
    recentDocs,
    nextDeadlines: upcomingDeadlines,
    revenueData,
  };
}

export default async function DashboardPage() {
  const user = await requireStaff();
  const [data, t] = await Promise.all([getStats(user.id), getTranslations("dashboard")]);
  const tc = await getTranslations("common");
  const td = await getTranslations("documents");

  const todoItems = [
    {
      count: data.weekDeadlineCount,
      label: t("deadlinesThisWeek", { count: data.weekDeadlineCount, plural: data.weekDeadlineCount > 1 ? "s" : "" }),
      href: "/clients",
      icon: CalendarClock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    {
      count: data.pendingDocs,
      label: t("docsPending", { count: data.pendingDocs, plural: data.pendingDocs > 1 ? "s" : "" }),
      href: "/documents",
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      count: data.overdueInvoices,
      label: t("invoicesOverdue", { count: data.overdueInvoices, plural: data.overdueInvoices > 1 ? "s" : "" }),
      href: "/invoices",
      icon: Receipt,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950",
    },
    {
      count: data.overdueMyTasks,
      label: t("tasksOverdue", { count: data.overdueMyTasks, plural: data.overdueMyTasks > 1 ? "s" : "" }),
      href: "/workflows",
      icon: GitBranch,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950",
    },
    {
      count: data.pendingDocRequests,
      label: `${data.pendingDocRequests} demande${data.pendingDocRequests > 1 ? "s" : ""} documentaire${data.pendingDocRequests > 1 ? "s" : ""} en attente`,
      href: "/autopilot",
      icon: Zap,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
  ].filter((item) => item.count > 0);

  const allClear = todoItems.length === 0;

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-lg font-semibold">{t("title")}</h1>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="size-4" />
          {t("todo")}
        </h2>
        {allClear ? (
          <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 p-4 flex items-center gap-3">
            <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              {t("allClear")}
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: t("metrics.activeClients"), value: data.activeClients, href: "/clients" },
          { label: t("metrics.pendingDocs"), value: data.pendingDocs, href: "/documents" },
          { label: t("metrics.unpaidInvoices"), value: data.unpaidInvoices, href: "/invoices" },
          { label: t("metrics.upcomingDeadlines"), value: data.upcomingDeadlines, href: "/clients" },
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

      <div>
        <h2 className="text-sm font-semibold mb-3">{t("revenue")}</h2>
        <div className="rounded-lg border p-4">
          <RevenueChart data={data.revenueData} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">{t("recentDocs")}</h2>
            <Link href="/documents" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              {tc("viewAll")} <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="rounded-lg border divide-y">
            {data.recentDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">{t("noDocs")}</p>
            ) : (
              data.recentDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents?companyId=${doc.companyId}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">{doc.companyName}</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    doc.status === "PROCESSED"
                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                  }`}>
                    {doc.status === "PROCESSED" ? td("processed") : td("pending")}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">{t("upcomingDeadlines")}</h2>
          </div>
          <div className="rounded-lg border divide-y">
            {data.nextDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">{t("noDeadlines")}</p>
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
                      {days <= 0 ? tc("today") : tc("days", { count: days })}
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
