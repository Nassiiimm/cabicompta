import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { workflowTemplates, workflowTemplateTasks } from "@/lib/db/schema";
import { requireStaff, requireAdmin } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1).max(255),
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

export async function GET() {
  try {
    await requireStaff();

    const templates = await db
      .select()
      .from(workflowTemplates)
      .orderBy(asc(workflowTemplates.name));

    const templatesWithTasks = await Promise.all(
      templates.map(async (t) => {
        const tasks = await db
          .select()
          .from(workflowTemplateTasks)
          .where(eq(workflowTemplateTasks.templateId, t.id))
          .orderBy(asc(workflowTemplateTasks.order));
        return { ...t, tasks };
      })
    );

    return Response.json({ templates: templatesWithTasks });
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
    const user = await requireAdmin();
    const body = await request.json();
    const { tasks, ...templateData } = templateSchema.parse(body);

    const [template] = await db
      .insert(workflowTemplates)
      .values({ ...templateData, createdBy: user.id, cabinetId: user.cabinetId })
      .returning();

    if (tasks && tasks.length > 0) {
      await db.insert(workflowTemplateTasks).values(
        tasks.map((t) => ({ ...t, templateId: template.id, cabinetId: user.cabinetId }))
      );
    }

    const insertedTasks = await db
      .select()
      .from(workflowTemplateTasks)
      .where(eq(workflowTemplateTasks.templateId, template.id))
      .orderBy(asc(workflowTemplateTasks.order));

    return Response.json({ template: { ...template, tasks: insertedTasks } }, { status: 201 });
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
