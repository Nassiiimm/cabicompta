import { db } from "@/lib/db";
import { workflowTasks, workflows, notifications, users, companies } from "@/lib/db/schema";
import { eq, and, lt, isNotNull, isNull, or, sql } from "drizzle-orm";

/**
 * GET /api/workflows/check-overdue
 * Cron job — vérifie les tâches en retard et crée des notifications.
 * Déclencher quotidiennement via vercel.json.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  // Fail-closed : si le secret n'est pas configuré, on refuse. Sinon la route
  // serait publiquement déclenchable (emails de masse, mutations).
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Tâches en retard : due_date dépassée + pas terminée/ignorée
  const overdueTasks = await db
    .select({
      taskId: workflowTasks.id,
      taskTitle: workflowTasks.title,
      workflowId: workflowTasks.workflowId,
      workflowName: workflows.name,
      companyName: companies.name,
      companyId: workflows.companyId,
      cabinetId: workflows.cabinetId,
      assignedTo: workflowTasks.assignedTo,
      workflowAssignedTo: workflows.assignedTo,
      dueDate: workflowTasks.dueDate,
    })
    .from(workflowTasks)
    .innerJoin(workflows, eq(workflowTasks.workflowId, workflows.id))
    .innerJoin(companies, eq(workflows.companyId, companies.id))
    .where(
      and(
        isNotNull(workflowTasks.dueDate),
        lt(workflowTasks.dueDate, today),
        sql`${workflowTasks.status} NOT IN ('DONE', 'SKIPPED')`,
        sql`${workflows.status} != 'CANCELLED'`
      )
    );

  if (overdueTasks.length === 0) {
    return Response.json({ notified: 0 });
  }

  // Récupérer tous les ADMIN pour les notifier aussi
  const admins = await db
    .select({ id: users.id, cabinetId: users.cabinetId })
    .from(users)
    .where(eq(users.role, "ADMIN"));

  // Cloisonnement : les admins ne sont notifiés que pour LEUR cabinet
  const adminsByCabinet = new Map<string, string[]>();
  for (const a of admins) {
    const list = adminsByCabinet.get(a.cabinetId) ?? [];
    list.push(a.id);
    adminsByCabinet.set(a.cabinetId, list);
  }

  const notificationsToInsert: (typeof notifications.$inferInsert)[] = [];

  for (const task of overdueTasks) {
    const targets = new Set<string>();

    // Notifier la personne assignée à la tâche
    if (task.assignedTo) targets.add(task.assignedTo);
    // Notifier la personne assignée au workflow
    if (task.workflowAssignedTo) targets.add(task.workflowAssignedTo);
    // Notifier les admins DU CABINET concerné
    (adminsByCabinet.get(task.cabinetId) ?? []).forEach((id) => targets.add(id));

    for (const userId of targets) {
      notificationsToInsert.push({
        cabinetId: task.cabinetId,
        userId,
        title: "Tâche en retard",
        message: `"${task.taskTitle}" dans le workflow "${task.workflowName}" (${task.companyName}) est en retard depuis le ${task.dueDate}.`,
        type: "TASK",
        link: `/clients/${task.companyId}?tab=workflows`,
      });
    }
  }

  if (notificationsToInsert.length > 0) {
    await db.insert(notifications).values(notificationsToInsert);
  }

  return Response.json({
    overdueTasks: overdueTasks.length,
    notified: notificationsToInsert.length,
  });
}
