import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflows, companies, users, workflowTasks } from "@/lib/db/schema";
import { eq, desc, count, and, sql } from "drizzle-orm";
import { GitBranch, Zap } from "lucide-react";
import { WorkflowsView } from "./workflows-view";
import { getTranslations } from "next-intl/server";

export default async function WorkflowsPage() {
  const user = await requireStaff();
  const t = await getTranslations("workflows");

  const STATUS_LABELS: Record<string, string> = {
    NOT_STARTED: t("statuses.NOT_STARTED"),
    IN_PROGRESS: t("statuses.IN_PROGRESS"),
    COMPLETED: t("statuses.COMPLETED"),
    CANCELLED: t("statuses.CANCELLED"),
  };

  const STATUS_VARIANTS: Record<string, "outline" | "default" | "secondary" | "destructive"> = {
    NOT_STARTED: "outline",
    IN_PROGRESS: "default",
    COMPLETED: "secondary",
    CANCELLED: "destructive",
  };

  const rows = await db
    .select({
      id: workflows.id,
      name: workflows.name,
      status: workflows.status,
      dueDate: workflows.dueDate,
      fiscalPeriod: workflows.fiscalPeriod,
      createdAt: workflows.createdAt,
      companyId: workflows.companyId,
      companyName: companies.name,
      assignedToName: users.name,
      assignedToId: workflows.assignedTo,
    })
    .from(workflows)
    .leftJoin(companies, eq(workflows.companyId, companies.id))
    .leftJoin(users, eq(workflows.assignedTo, users.id))
    .where(eq(workflows.cabinetId, user.cabinetId))
    .orderBy(desc(workflows.createdAt));

  const taskStats = await db
    .select({
      workflowId: workflowTasks.workflowId,
      total: count(),
      done: sql<number>`count(*) filter (where ${workflowTasks.status} IN ('DONE', 'SKIPPED'))::int`,
      overdue: sql<number>`count(*) filter (where ${workflowTasks.dueDate} < current_date and ${workflowTasks.status} NOT IN ('DONE','SKIPPED'))::int`,
    })
    .from(workflowTasks)
    .where(eq(workflowTasks.cabinetId, user.cabinetId))
    .groupBy(workflowTasks.workflowId);

  const statsMap = new Map(taskStats.map((s) => [s.workflowId, s]));

  const enriched = rows.map((w) => {
    const s = statsMap.get(w.id);
    return {
      ...w,
      assignedToId: w.assignedToId ?? null,
      total: Number(s?.total ?? 0),
      done: Number(s?.done ?? 0),
      overdue: Number(s?.overdue ?? 0),
    };
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <GitBranch className="size-5" />
          {t("title")}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{t("total", { count: rows.length })}</span>
          <Link href="/autopilot" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <Zap className="size-3" />
            Pilote automatique
          </Link>
        </div>
      </div>
      <WorkflowsView workflows={enriched} statusLabels={STATUS_LABELS} statusVariants={STATUS_VARIANTS} currentUserId={user.id} />
    </div>
  );
}
