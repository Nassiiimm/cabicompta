import { requireStaff } from "@/lib/auth";
import { runAutopilot } from "@/lib/autopilot";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  companies,
  fiscalDeadlines,
  workflows,
  documentRequests,
} from "@/lib/db/schema";
import { eq, and, isNull, count, sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const user = await requireStaff();
    if (user.role === "INTERN") {
      return Response.json({ error: "Accès réservé" }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const { year = new Date().getFullYear(), companyIds, assignedTo } = body;

    const results = await runAutopilot(
      year,
      companyIds ?? undefined,
      assignedTo ?? user.id
    );

    const totalDeadlines = results.reduce((s, r) => s + r.deadlinesCreated, 0);
    const totalWorkflows = results.reduce((s, r) => s + r.workflowsCreated, 0);
    const totalDocs = results.reduce((s, r) => s + r.docRequestsCreated, 0);
    const errors = results.filter((r) => r.error);

    logAudit({
      userId: user.id,
      action: "CREATE",
      tableName: "autopilot",
      newData: { year, companies: results.length, totalDeadlines, totalWorkflows },
    });

    return Response.json({
      year,
      companiesProcessed: results.length,
      deadlinesCreated: totalDeadlines,
      workflowsCreated: totalWorkflows,
      docRequestsCreated: totalDocs,
      errors: errors.map((r) => ({ company: r.companyName, error: r.error })),
      results,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[autopilot] error:", error);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** Dashboard — statut global par client pour l'année */
export async function GET(request: Request) {
  try {
    const user = await requireStaff();
    if (user.role === "INTERN") {
      return Response.json({ error: "Accès réservé" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year") ?? new Date().getFullYear());

    // Toutes les sociétés actives
    const allCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        type: companies.type,
        assignedToId: companies.assignedTo,
      })
      .from(companies)
      .where(and(eq(companies.status, "ACTIVE"), isNull(companies.deletedAt)));

    // Compteurs d'échéances par company × statut
    const deadlineStats = await db
      .select({
        companyId: fiscalDeadlines.companyId,
        status: fiscalDeadlines.status,
        cnt: count(),
      })
      .from(fiscalDeadlines)
      .where(
        and(
          isNull(fiscalDeadlines.deletedAt),
          sql`EXTRACT(YEAR FROM ${fiscalDeadlines.dueDate}) = ${year}`
        )
      )
      .groupBy(fiscalDeadlines.companyId, fiscalDeadlines.status);

    // Compteurs de workflows par company × statut
    const workflowStats = await db
      .select({
        companyId: workflows.companyId,
        status: workflows.status,
        cnt: count(),
      })
      .from(workflows)
      .where(sql`EXTRACT(YEAR FROM ${workflows.dueDate}) = ${year}`)
      .groupBy(workflows.companyId, workflows.status);

    // Demandes documentaires en attente par company
    const pendingDocs = await db
      .select({
        companyId: documentRequests.companyId,
        cnt: count(),
      })
      .from(documentRequests)
      .where(eq(documentRequests.status, "PENDING"))
      .groupBy(documentRequests.companyId);

    // Agréger par client
    const deadlineMap = new Map<string, Record<string, number>>();
    for (const d of deadlineStats) {
      if (!deadlineMap.has(d.companyId)) deadlineMap.set(d.companyId, {});
      deadlineMap.get(d.companyId)![d.status] = Number(d.cnt);
    }

    const workflowMap = new Map<string, Record<string, number>>();
    for (const w of workflowStats) {
      if (!workflowMap.has(w.companyId)) workflowMap.set(w.companyId, {});
      workflowMap.get(w.companyId)![w.status] = Number(w.cnt);
    }

    const pendingDocsMap = new Map<string, number>();
    for (const p of pendingDocs) {
      pendingDocsMap.set(p.companyId, Number(p.cnt));
    }

    const dashboard = allCompanies.map((c) => {
      const dl = deadlineMap.get(c.id) ?? {};
      const wf = workflowMap.get(c.id) ?? {};
      const pendingDocCount = pendingDocsMap.get(c.id) ?? 0;
      const totalDeadlines = Object.values(dl).reduce((s, v) => s + v, 0);
      const overdue = (dl["OVERDUE"] ?? 0) + (wf["NOT_STARTED"] ?? 0);

      return {
        id: c.id,
        name: c.name,
        type: c.type,
        autopilotActive: totalDeadlines > 0,
        deadlines: {
          total: totalDeadlines,
          upcoming: dl["UPCOMING"] ?? 0,
          inProgress: dl["IN_PROGRESS"] ?? 0,
          filed: dl["FILED"] ?? 0,
          overdue: dl["OVERDUE"] ?? 0,
        },
        workflows: {
          total: Object.values(wf).reduce((s, v) => s + v, 0),
          notStarted: wf["NOT_STARTED"] ?? 0,
          inProgress: wf["IN_PROGRESS"] ?? 0,
          completed: wf["COMPLETED"] ?? 0,
        },
        pendingDocuments: pendingDocCount,
        risk: overdue > 0 ? "HIGH" : pendingDocCount > 3 ? "MEDIUM" : "LOW",
      };
    });

    const summary = {
      totalCompanies: dashboard.length,
      autopilotActive: dashboard.filter((c) => c.autopilotActive).length,
      atRisk: dashboard.filter((c) => c.risk === "HIGH").length,
      pendingDocuments: dashboard.reduce((s, c) => s + c.pendingDocuments, 0),
      totalWorkflows: dashboard.reduce((s, c) => s + c.workflows.total, 0),
    };

    return Response.json({ year, summary, companies: dashboard });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
