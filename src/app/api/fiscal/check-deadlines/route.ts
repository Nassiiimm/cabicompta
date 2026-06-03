import { db } from "@/lib/db";
import {
  fiscalDeadlines,
  notifications,
  companyMembers,
  companies,
} from "@/lib/db/schema";
import { eq, and, sql, lte, gte } from "drizzle-orm";
import { REMINDER_DAYS, getReminderMessage } from "@/lib/fiscal-calendar";

/**
 * Cron endpoint — vérifie les échéances fiscales et envoie des notifications.
 *
 * Peut être appelé par un cron Vercel ou manuellement.
 * Protégé par un secret en production.
 */
export async function GET(request: Request) {
  // Simple auth for cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  // Fail-closed : si le secret n'est pas configuré, on refuse. Sinon la route
  // serait publiquement déclenchable (emails de masse, mutations).
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let notifsSent = 0;

  for (const daysBefore of REMINDER_DAYS) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysBefore);
    const targetStr = targetDate.toISOString().split("T")[0];

    // Find deadlines due on this target date that are still UPCOMING
    const upcomingDeadlines = await db
      .select({
        id: fiscalDeadlines.id,
        companyId: fiscalDeadlines.companyId,
        cabinetId: fiscalDeadlines.cabinetId,
        type: fiscalDeadlines.type,
        label: fiscalDeadlines.label,
        dueDate: fiscalDeadlines.dueDate,
        period: fiscalDeadlines.period,
        companyName: companies.name,
      })
      .from(fiscalDeadlines)
      .innerJoin(companies, eq(fiscalDeadlines.companyId, companies.id))
      .where(
        and(
          eq(fiscalDeadlines.dueDate, targetStr),
          eq(fiscalDeadlines.status, "UPCOMING")
        )
      );

    for (const deadline of upcomingDeadlines) {
      const { title, message } = getReminderMessage(daysBefore, deadline.label);

      // Get all members of this company (clients + staff assigned)
      const members = await db
        .select({ userId: companyMembers.userId })
        .from(companyMembers)
        .where(eq(companyMembers.companyId, deadline.companyId));

      // Check we haven't already sent this exact reminder
      for (const member of members) {
        const existingNotif = await db
          .select({ id: notifications.id })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, member.userId),
              eq(notifications.title, title),
              sql`${notifications.createdAt} >= NOW() - INTERVAL '24 hours'`
            )
          )
          .limit(1);

        if (existingNotif.length === 0) {
          await db.insert(notifications).values({
            cabinetId: deadline.cabinetId,
            userId: member.userId,
            title,
            message: `${deadline.companyName} — ${message}`,
            type: "DEADLINE",
            link: "/portal",
          });
          notifsSent++;
        }
      }
    }
  }

  // Also mark past deadlines as OVERDUE
  const todayStr = today.toISOString().split("T")[0];
  await db
    .update(fiscalDeadlines)
    .set({ status: "OVERDUE" })
    .where(
      and(
        eq(fiscalDeadlines.status, "UPCOMING"),
        sql`${fiscalDeadlines.dueDate} < ${todayStr}`
      )
    );

  return Response.json({
    checked: new Date().toISOString(),
    notificationsSent: notifsSent,
  });
}
