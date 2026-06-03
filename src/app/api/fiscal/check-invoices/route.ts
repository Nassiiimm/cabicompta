import { db } from "@/lib/db";
import {
  invoices,
  companies,
  companyMembers,
  notifications,
  users,
} from "@/lib/db/schema";
import { eq, and, sql, lt } from "drizzle-orm";
import { sendInvoiceOverdueEmail } from "@/lib/email";

/**
 * Cron endpoint — marque les factures SENT en retard comme OVERDUE
 * et envoie une notification + email aux membres de la compagnie.
 */
export async function GET(request: Request) {
  // Auth cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  // Fail-closed : si le secret n'est pas configuré, on refuse. Sinon la route
  // serait publiquement déclenchable (emails de masse, mutations).
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // Find all SENT invoices with dueDate < today
  const overdueInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      dueDate: invoices.dueDate,
      companyId: invoices.companyId,
      cabinetId: invoices.cabinetId,
      companyName: companies.name,
    })
    .from(invoices)
    .innerJoin(companies, eq(invoices.companyId, companies.id))
    .where(
      and(
        eq(invoices.status, "SENT"),
        lt(invoices.dueDate, todayStr)
      )
    );

  let notificationsSent = 0;

  for (const inv of overdueInvoices) {
    // Update status to OVERDUE
    await db
      .update(invoices)
      .set({ status: "OVERDUE", updatedAt: new Date() })
      .where(eq(invoices.id, inv.id));

    // Calculate days late
    const dueDate = new Date(inv.dueDate!);
    const daysLate = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const totalFormatted = new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: "CAD",
    }).format(Number(inv.total));

    // Get all members of this company
    const members = await db
      .select({
        userId: companyMembers.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(companyMembers)
      .innerJoin(users, eq(companyMembers.userId, users.id))
      .where(eq(companyMembers.companyId, inv.companyId));

    const title = `Facture ${inv.invoiceNumber} en retard`;

    for (const member of members) {
      // Dedup: check if notification already sent in last 24h
      const existing = await db
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

      if (existing.length === 0) {
        await db.insert(notifications).values({
          cabinetId: inv.cabinetId,
          userId: member.userId,
          title,
          message: `${inv.companyName} — Facture ${inv.invoiceNumber} de ${totalFormatted} est en retard de ${daysLate} jour${daysLate > 1 ? "s" : ""}.`,
          type: "INVOICE",
          link: `/invoices/${inv.id}`,
        });

        // Send email
        await sendInvoiceOverdueEmail(
          member.userEmail,
          member.userName,
          inv.invoiceNumber,
          totalFormatted,
          daysLate
        );

        notificationsSent++;
      }
    }
  }

  return Response.json({
    checked: new Date().toISOString(),
    overdueCount: overdueInvoices.length,
    notificationsSent,
  });
}
