import { db } from "@/lib/db";
import {
  fiscalDeadlines,
  documents,
  notifications,
  companyMembers,
  companies,
  users,
} from "@/lib/db/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { sendDeadlineReminderEmail } from "@/lib/email";

/**
 * Relances automatiques — envoie un rappel 5 jours avant une échéance
 * si aucun document n'a été téléversé pour la période concernée.
 *
 * Peut être appelé par un cron Vercel quotidien.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const fiveDaysFromNow = new Date(today);
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
  const targetDate = fiveDaysFromNow.toISOString().split("T")[0];

  // Find deadlines due in exactly 5 days
  const upcomingDeadlines = await db
    .select({
      id: fiscalDeadlines.id,
      companyId: fiscalDeadlines.companyId,
      label: fiscalDeadlines.label,
      period: fiscalDeadlines.period,
      dueDate: fiscalDeadlines.dueDate,
      type: fiscalDeadlines.type,
      companyName: companies.name,
    })
    .from(fiscalDeadlines)
    .innerJoin(companies, eq(fiscalDeadlines.companyId, companies.id))
    .where(
      and(
        eq(fiscalDeadlines.dueDate, targetDate),
        eq(fiscalDeadlines.status, "UPCOMING")
      )
    );

  let reminders = 0;

  for (const deadline of upcomingDeadlines) {
    // Check if any document has been uploaded for this period
    const fiscalYear = deadline.period
      ? parseInt(deadline.period.substring(0, 4))
      : null;

    let hasDocuments = false;
    if (fiscalYear) {
      const [docCount] = await db
        .select({ v: count() })
        .from(documents)
        .where(
          and(
            eq(documents.companyId, deadline.companyId),
            eq(documents.fiscalYear, fiscalYear),
            eq(documents.status, "PROCESSED")
          )
        );
      hasDocuments = (docCount?.v ?? 0) > 0;
    }

    // If no documents uploaded, send reminder
    if (!hasDocuments) {
      const members = await db
        .select({
          userId: companyMembers.userId,
          email: users.email,
          name: users.name,
        })
        .from(companyMembers)
        .innerJoin(users, eq(companyMembers.userId, users.id))
        .where(eq(companyMembers.companyId, deadline.companyId));

      for (const member of members) {
        // Check not already notified today
        const [existing] = await db
          .select({ id: notifications.id })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, member.userId),
              sql`${notifications.title} LIKE ${"%" + deadline.label + "%"}`,
              sql`${notifications.createdAt} >= NOW() - INTERVAL '24 hours'`
            )
          )
          .limit(1);

        if (!existing) {
          // In-app notification
          await db.insert(notifications).values({
            userId: member.userId,
            title: `Rappel — ${deadline.label}`,
            message: `${deadline.companyName} — Échéance dans 5 jours. Aucun document traité pour cette période.`,
            type: "DEADLINE",
            link: "/portal",
          });

          // Email
          sendDeadlineReminderEmail(member.email, member.name, deadline.label, 5);

          reminders++;
        }
      }
    }
  }

  return Response.json({
    checked: new Date().toISOString(),
    deadlinesChecked: upcomingDeadlines.length,
    remindersSent: reminders,
  });
}
