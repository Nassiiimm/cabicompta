import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  workflows,
  workflowTasks,
  workflowTemplateTasks,
  companies,
  users,
} from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth";
import { eq, desc, and, asc } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  templateId: z.string().uuid().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  fiscalPeriod: z.string().max(50).optional().nullable(),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional().nullable(),
        order: z.number().int().min(0),
        estimatedMinutes: z.number().int().min(1).optional().nullable(),
        assignedTo: z.string().uuid().optional().nullable(),
      })
    )
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireStaff();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    // INTERN : seulement les workflows des clients qui lui sont assignés
    const internFilter =
      user.role === "INTERN" ? eq(companies.assignedTo, user.id) : undefined;
    const companyFilter = companyId ? eq(workflows.companyId, companyId) : undefined;
    const whereCondition = internFilter && companyFilter
      ? and(companyFilter, internFilter)
      : internFilter ?? companyFilter;

    const rows = await db
      .select({
        id: workflows.id,
        name: workflows.name,
        status: workflows.status,
        dueDate: workflows.dueDate,
        fiscalPeriod: workflows.fiscalPeriod,
        createdAt: workflows.createdAt,
        updatedAt: workflows.updatedAt,
        companyId: workflows.companyId,
        companyName: companies.name,
        assignedToId: workflows.assignedTo,
        assignedToName: users.name,
      })
      .from(workflows)
      .leftJoin(companies, eq(workflows.companyId, companies.id))
      .leftJoin(users, eq(workflows.assignedTo, users.id))
      .where(whereCondition)
      .orderBy(desc(workflows.createdAt));

    return Response.json({ workflows: rows });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized")
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    if (error instanceof Error && error.message === "Forbidden")
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireStaff();
    const body = await request.json();
    const { tasks: customTasks, ...data } = createSchema.parse(body);

    const [workflow] = await db
      .insert(workflows)
      .values({ ...data, createdBy: user.id, cabinetId: user.cabinetId })
      .returning();

    // Si un template est fourni, copier ses tâches
    if (data.templateId && !customTasks) {
      const templateTasks = await db
        .select()
        .from(workflowTemplateTasks)
        .where(eq(workflowTemplateTasks.templateId, data.templateId))
        .orderBy(asc(workflowTemplateTasks.order));

      if (templateTasks.length > 0) {
        await db.insert(workflowTasks).values(
          templateTasks.map((t) => ({
            cabinetId: user.cabinetId,
            workflowId: workflow.id,
            title: t.title,
            description: t.description,
            order: t.order,
            estimatedMinutes: t.estimatedMinutes,
          }))
        );
      }
    } else if (customTasks && customTasks.length > 0) {
      await db.insert(workflowTasks).values(
        customTasks.map((t) => ({ ...t, workflowId: workflow.id, cabinetId: user.cabinetId }))
      );
    }

    logAudit({
      cabinetId: user.cabinetId,
      userId: user.id,
      action: "CREATE",
      tableName: "workflows",
      recordId: workflow.id,
      newData: { name: workflow.name, companyId: workflow.companyId },
    });

    const tasks = await db
      .select()
      .from(workflowTasks)
      .where(eq(workflowTasks.workflowId, workflow.id))
      .orderBy(asc(workflowTasks.order));

    return Response.json({ workflow: { ...workflow, tasks } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized")
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    if (error instanceof Error && error.message === "Forbidden")
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    if (error instanceof z.ZodError)
      return Response.json({ error: "Données invalides", details: error.issues }, { status: 400 });
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
