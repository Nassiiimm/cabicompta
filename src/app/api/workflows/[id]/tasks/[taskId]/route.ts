import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { workflowTasks, workflows } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "SKIPPED"]).optional(),
  notes: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  blockedBy: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const user = await requireStaff();
    const { id, taskId } = await segmentData.params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    // Vérifier que la tâche appartient bien au workflow
    const [task] = await db
      .select()
      .from(workflowTasks)
      .where(and(eq(workflowTasks.id, taskId), eq(workflowTasks.workflowId, id)))
      .limit(1);

    if (!task) return Response.json({ error: "Introuvable" }, { status: 404 });

    // Vérifier que le bloqueur est résolu avant de progresser
    if (
      data.status &&
      ["IN_PROGRESS", "DONE"].includes(data.status) &&
      task.blockedBy
    ) {
      const [blocker] = await db
        .select({ status: workflowTasks.status })
        .from(workflowTasks)
        .where(eq(workflowTasks.id, task.blockedBy))
        .limit(1);

      if (blocker && blocker.status !== "DONE" && blocker.status !== "SKIPPED") {
        return Response.json(
          { error: "Cette tâche est bloquée par une tâche non terminée." },
          { status: 409 }
        );
      }
    }

    const completedAt =
      data.status === "DONE" && task.status !== "DONE"
        ? new Date()
        : data.status && data.status !== "DONE"
        ? null
        : task.completedAt;

    const completedBy =
      data.status === "DONE" && task.status !== "DONE"
        ? user.id
        : data.status && data.status !== "DONE"
        ? null
        : task.completedBy;

    // Transaction atomique : mise à jour tâche + recalcul statut workflow
    const updated = await db.transaction(async (tx) => {
      const [updatedTask] = await tx
        .update(workflowTasks)
        .set({ ...data, completedAt, completedBy, updatedAt: new Date() })
        .where(eq(workflowTasks.id, taskId))
        .returning();

      const allTasks = await tx
        .select({ status: workflowTasks.status })
        .from(workflowTasks)
        .where(eq(workflowTasks.workflowId, id));

      const total = allTasks.length;
      const done = allTasks.filter((t) => t.status === "DONE" || t.status === "SKIPPED").length;
      const inProgress = allTasks.filter((t) => t.status === "IN_PROGRESS").length;

      const newWorkflowStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" =
        total > 0 && done === total ? "COMPLETED"
        : inProgress > 0 || done > 0 ? "IN_PROGRESS"
        : "NOT_STARTED";

      await tx
        .update(workflows)
        .set({ status: newWorkflowStatus, updatedAt: new Date() })
        .where(eq(workflows.id, id));

      return updatedTask;
    });

    return Response.json({ task: updated });
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
