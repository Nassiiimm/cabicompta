import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { workflowTemplates, workflowTemplateTasks } from "@/lib/db/schema";
import { requireStaff, requireAdmin } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional().nullable(),
        order: z.number().int().min(0),
        estimatedMinutes: z.number().int().min(1).optional().nullable(),
      })
    )
    .optional(),
});

export async function GET(
  _request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();
    const { id } = await segmentData.params;

    const [template] = await db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, id))
      .limit(1);

    if (!template) return Response.json({ error: "Introuvable" }, { status: 404 });

    const tasks = await db
      .select()
      .from(workflowTemplateTasks)
      .where(eq(workflowTemplateTasks.templateId, id))
      .orderBy(asc(workflowTemplateTasks.order));

    return Response.json({ template: { ...template, tasks } });
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
    await requireAdmin();
    const { id } = await segmentData.params;
    const body = await request.json();
    const { tasks, ...templateData } = updateSchema.parse(body);

    const [updated] = await db
      .update(workflowTemplates)
      .set({ ...templateData, updatedAt: new Date() })
      .where(eq(workflowTemplates.id, id))
      .returning();

    if (!updated) return Response.json({ error: "Introuvable" }, { status: 404 });

    if (tasks !== undefined) {
      await db.delete(workflowTemplateTasks).where(eq(workflowTemplateTasks.templateId, id));
      if (tasks.length > 0) {
        await db.insert(workflowTemplateTasks).values(
          tasks.map((t) => ({ ...t, templateId: id }))
        );
      }
    }

    const updatedTasks = await db
      .select()
      .from(workflowTemplateTasks)
      .where(eq(workflowTemplateTasks.templateId, id))
      .orderBy(asc(workflowTemplateTasks.order));

    return Response.json({ template: { ...updated, tasks: updatedTasks } });
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
    await requireAdmin();
    const { id } = await segmentData.params;

    const [deleted] = await db
      .delete(workflowTemplates)
      .where(eq(workflowTemplates.id, id))
      .returning();

    if (!deleted) return Response.json({ error: "Introuvable" }, { status: 404 });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized")
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    if (error instanceof Error && error.message === "Forbidden")
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
