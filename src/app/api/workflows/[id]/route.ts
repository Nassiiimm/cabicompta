import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { workflows, workflowTasks, users } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth";
import { hasCompanyAccess } from "@/lib/authz";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  fiscalPeriod: z.string().max(50).optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStaff();
    const { id } = await segmentData.params;

    const [workflow] = await db
      .select({
        id: workflows.id,
        name: workflows.name,
        status: workflows.status,
        dueDate: workflows.dueDate,
        fiscalPeriod: workflows.fiscalPeriod,
        companyId: workflows.companyId,
        templateId: workflows.templateId,
        createdAt: workflows.createdAt,
        updatedAt: workflows.updatedAt,
        assignedToId: workflows.assignedTo,
        assignedToName: users.name,
      })
      .from(workflows)
      .leftJoin(users, eq(workflows.assignedTo, users.id))
      .where(eq(workflows.id, id))
      .limit(1);

    if (!workflow) return Response.json({ error: "Introuvable" }, { status: 404 });

    if (!(await hasCompanyAccess(user, workflow.companyId))) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const tasks = await db
      .select({
        id: workflowTasks.id,
        title: workflowTasks.title,
        description: workflowTasks.description,
        order: workflowTasks.order,
        status: workflowTasks.status,
        notes: workflowTasks.notes,
        estimatedMinutes: workflowTasks.estimatedMinutes,
        completedAt: workflowTasks.completedAt,
        assignedToId: workflowTasks.assignedTo,
        assignedToName: users.name,
      })
      .from(workflowTasks)
      .leftJoin(users, eq(workflowTasks.assignedTo, users.id))
      .where(eq(workflowTasks.workflowId, id))
      .orderBy(asc(workflowTasks.order));

    return Response.json({ workflow: { ...workflow, tasks } });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized")
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    if (error instanceof Error && error.message === "Forbidden")
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStaff();
    const { id } = await segmentData.params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const [old] = await db.select().from(workflows).where(eq(workflows.id, id)).limit(1);
    if (!old) return Response.json({ error: "Introuvable" }, { status: 404 });

    if (!(await hasCompanyAccess(user, old.companyId))) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const [updated] = await db
      .update(workflows)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();

    logAudit({
      cabinetId: user.cabinetId,
      userId: user.id,
      action: "UPDATE",
      tableName: "workflows",
      recordId: id,
      oldData: { status: old.status },
      newData: data,
    });

    return Response.json({ workflow: updated });
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

export async function DELETE(
  _request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStaff();
    const { id } = await segmentData.params;

    const [existing] = await db
      .select({ companyId: workflows.companyId })
      .from(workflows)
      .where(eq(workflows.id, id))
      .limit(1);
    if (!existing) return Response.json({ error: "Introuvable" }, { status: 404 });
    if (!(await hasCompanyAccess(user, existing.companyId))) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const [deleted] = await db
      .delete(workflows)
      .where(eq(workflows.id, id))
      .returning();

    if (!deleted) return Response.json({ error: "Introuvable" }, { status: 404 });

    logAudit({
      cabinetId: user.cabinetId,
      userId: user.id,
      action: "DELETE",
      tableName: "workflows",
      recordId: id,
      oldData: { name: deleted.name },
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized")
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    if (error instanceof Error && error.message === "Forbidden")
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
