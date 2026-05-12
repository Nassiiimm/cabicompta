import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  invoices,
  fiscalDeadlines,
  timeEntries,
  users,
  companies,
  workflows,
  workflowTasks,
} from "@/lib/db/schema";
import { sql, eq, and, isNull, gte } from "drizzle-orm";
import { ExportButton } from "@/components/cabinet/export-button";
import { RevenueChart } from "@/components/cabinet/revenue-chart";

async function getPracticeData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Revenue
  const [totalFacture] = await db
    .select({
      v: sql<string>`coalesce(sum(${invoices.total}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        sql`${invoices.status} != 'DRAFT'`,
        isNull(invoices.deletedAt)
      )
    );

  const [totalEncaisse] = await db
    .select({
      v: sql<string>`coalesce(sum(${invoices.total}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.status, "PAID"),
        isNull(invoices.deletedAt)
      )
    );

  const [totalImpaye] = await db
    .select({
      v: sql<string>`coalesce(sum(${invoices.total}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        sql`${invoices.status} IN ('SENT', 'OVERDUE')`,
        isNull(invoices.deletedAt)
      )
    );

  // Deadlines this month
  const monthFilter = and(
    eq(fiscalDeadlines.status, "UPCOMING"),
    sql`${fiscalDeadlines.dueDate} >= ${startOfMonth.toISOString().slice(0, 10)}`,
    sql`${fiscalDeadlines.dueDate} <= ${endOfMonth.toISOString().slice(0, 10)}`
  );

  const [t2Count] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(fiscalDeadlines)
    .where(and(monthFilter, eq(fiscalDeadlines.type, "T2")));

  const [co17Count] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(fiscalDeadlines)
    .where(and(monthFilter, eq(fiscalDeadlines.type, "CO17")));

  const [tpsTvqCount] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(fiscalDeadlines)
    .where(and(monthFilter, eq(fiscalDeadlines.type, "TPS_TVQ")));

  const [overdueCount] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(fiscalDeadlines)
    .where(eq(fiscalDeadlines.status, "OVERDUE"));

  // Staff workload this month
  const staffHours = await db
    .select({
      name: users.name,
      totalMinutes: sql<number>`coalesce(sum(${timeEntries.duration}), 0)::int`,
    })
    .from(users)
    .leftJoin(
      timeEntries,
      and(
        eq(timeEntries.userId, users.id),
        sql`${timeEntries.date} >= ${startOfMonth.toISOString().slice(0, 10)}`,
        sql`${timeEntries.date} <= ${endOfMonth.toISOString().slice(0, 10)}`
      )
    )
    .where(sql`${users.role} IN ('ADMIN', 'STAFF')`)
    .groupBy(users.id, users.name);

  // Compliance
  const [kycNotVerified] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(companies)
    .where(
      and(
        eq(companies.kycVerified, false),
        eq(companies.status, "ACTIVE"),
        isNull(companies.deletedAt)
      )
    );

  const [conflictNotChecked] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(companies)
    .where(
      and(
        eq(companies.conflictCheck, false),
        eq(companies.status, "ACTIVE"),
        isNull(companies.deletedAt)
      )
    );

  // Revenue chart — 1 seule requête GROUP BY
  const MONTH_NAMES = ["jan", "fev", "mar", "avr", "mai", "jun", "jul", "aou", "sep", "oct", "nov", "dec"];
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const revenueRows = await db
    .select({
      year: sql<number>`extract(year from ${invoices.issuedAt})::int`,
      month: sql<number>`extract(month from ${invoices.issuedAt})::int`,
      facture: sql<string>`coalesce(sum(${invoices.total}) filter (where ${invoices.status} != 'DRAFT'), 0)`,
      encaisse: sql<string>`coalesce(sum(${invoices.total}) filter (where ${invoices.status} = 'PAID'), 0)`,
    })
    .from(invoices)
    .where(and(isNull(invoices.deletedAt), gte(invoices.issuedAt, sixMonthsAgo)))
    .groupBy(sql`extract(year from ${invoices.issuedAt})`, sql`extract(month from ${invoices.issuedAt})`)
    .orderBy(sql`extract(year from ${invoices.issuedAt})`, sql`extract(month from ${invoices.issuedAt})`);

  const revenueMap = new Map(revenueRows.map((r) => [`${r.year}-${r.month}`, r]));
  const revenueData: { month: string; facture: number; encaisse: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const row = revenueMap.get(key);
    revenueData.push({
      month: MONTH_NAMES[d.getMonth()],
      facture: parseFloat(row?.facture ?? "0"),
      encaisse: parseFloat(row?.encaisse ?? "0"),
    });
  }

  // Charge workflows par comptable
  const workflowLoad = await db
    .select({
      name: users.name,
      activeWorkflows: sql<number>`count(distinct ${workflows.id}) filter (where ${workflows.status} IN ('NOT_STARTED','IN_PROGRESS'))::int`,
      overdueTasks: sql<number>`count(${workflowTasks.id}) filter (where ${workflowTasks.dueDate} < current_date and ${workflowTasks.status} NOT IN ('DONE','SKIPPED'))::int`,
    })
    .from(users)
    .leftJoin(workflows, eq(workflows.assignedTo, users.id))
    .leftJoin(workflowTasks, and(
      eq(workflowTasks.workflowId, workflows.id),
      eq(workflowTasks.assignedTo, users.id)
    ))
    .where(sql`${users.role} IN ('ADMIN', 'STAFF')`)
    .groupBy(users.id, users.name)
    .orderBy(users.name);

  return {
    totalFacture: parseFloat(totalFacture?.v ?? "0"),
    totalEncaisse: parseFloat(totalEncaisse?.v ?? "0"),
    totalImpaye: parseFloat(totalImpaye?.v ?? "0"),
    t2: t2Count?.v ?? 0,
    co17: co17Count?.v ?? 0,
    tpsTvq: tpsTvqCount?.v ?? 0,
    overdue: overdueCount?.v ?? 0,
    staffHours,
    workflowLoad,
    kycNotVerified: kycNotVerified?.v ?? 0,
    conflictNotChecked: conflictNotChecked?.v ?? 0,
    revenueData,
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
}

export default async function PracticePage() {
  await requireAdmin();
  const data = await getPracticeData();

  const monthName = new Date().toLocaleDateString("fr-CA", { month: "long", year: "numeric" });

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Vue pratique</h1>
        <div className="flex items-center gap-1">
          <ExportButton href="/api/export/invoices" label="Factures" />
          <ExportButton href="/api/export/time-entries" label="Temps" />
          <ExportButton href="/api/export/clients" label="Clients" />
        </div>
      </div>

      {/* Revenue */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Revenus</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Total facturé", value: formatCurrency(data.totalFacture), color: "" },
            { label: "Total encaissé", value: formatCurrency(data.totalEncaisse), color: "text-green-600 dark:text-green-400" },
            { label: "Total impayé", value: formatCurrency(data.totalImpaye), color: "text-amber-600 dark:text-amber-400" },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border p-4">
              <p className={`text-2xl font-bold tracking-tight ${m.color}`}>{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border p-4 mt-3">
          <RevenueChart data={data.revenueData} />
        </div>
      </div>

      {/* Deadlines */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Échéances — {monthName}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "T2 à venir", value: data.t2 },
            { label: "CO-17 à venir", value: data.co17 },
            { label: "TPS/TVQ à venir", value: data.tpsTvq },
            { label: "En retard (total)", value: data.overdue, alert: data.overdue > 0 },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border p-4">
              <p className={`text-2xl font-bold tracking-tight ${
                "alert" in m && m.alert ? "text-red-600 dark:text-red-400" : ""
              }`}>{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Staff Workload */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Temps saisi — {monthName}</h2>
          <div className="rounded-lg border divide-y">
            {data.staffHours.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">Aucun employé</p>
            ) : (
              data.staffHours.map((s) => {
                const hours = (s.totalMinutes / 60).toFixed(1);
                return (
                  <div key={s.name} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-sm font-medium">{s.name}</p>
                    <span className="text-sm text-muted-foreground">{hours}h</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Workflow workload */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Charge workflows</h2>
          <div className="rounded-lg border divide-y">
            {data.workflowLoad.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">Aucun employé</p>
            ) : (
              data.workflowLoad.map((s) => (
                <div key={s.name} className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-sm font-medium">{s.name}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {s.activeWorkflows} workflow{s.activeWorkflows !== 1 ? "s" : ""}
                    </span>
                    {s.overdueTasks > 0 && (
                      <span className="text-amber-600 font-medium">
                        {s.overdueTasks} tâche{s.overdueTasks !== 1 ? "s" : ""} en retard
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Compliance */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Conformité</h2>
          <div className="rounded-lg border divide-y">
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm">KYC non vérifié</p>
              <span className={`text-sm font-medium ${
                data.kycNotVerified > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-green-600 dark:text-green-400"
              }`}>
                {data.kycNotVerified} client{data.kycNotVerified !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm">Conflit d&apos;intérêts non vérifié</p>
              <span className={`text-sm font-medium ${
                data.conflictNotChecked > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-green-600 dark:text-green-400"
              }`}>
                {data.conflictNotChecked} client{data.conflictNotChecked !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
