import { getPlatformAdmin, logPlatformAction } from "@/lib/platform";
import { db } from "@/lib/db";
import {
  cabinets, users, companies, companyMembers, documents, documentRequests,
  invoices, invoiceItems, fiscalDeadlines, workflows, workflowTasks,
  workflowTemplates, workflowTemplateTasks, timeEntries, kycDocuments,
  portalMessages, notifications,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Export Loi 25 (portabilité) — toutes les données d'un cabinet en JSON.
// Réservé aux super-admins. Audité. NB : exporte les LIGNES (métadonnées),
// pas les fichiers binaires du storage.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const [cabinet] = await db.select().from(cabinets).where(eq(cabinets.id, id)).limit(1);
  if (!cabinet) return Response.json({ error: "Cabinet introuvable" }, { status: 404 });

  const [
    usersR, companiesR, membersR, documentsR, docReqR, invoicesR, invoiceItemsR,
    deadlinesR, workflowsR, wTasksR, wTemplatesR, wTemplateTasksR, timeR, kycR, msgR, notifR,
  ] = await Promise.all([
    db.select().from(users).where(eq(users.cabinetId, id)),
    db.select().from(companies).where(eq(companies.cabinetId, id)),
    db.select().from(companyMembers).where(eq(companyMembers.cabinetId, id)),
    db.select().from(documents).where(eq(documents.cabinetId, id)),
    db.select().from(documentRequests).where(eq(documentRequests.cabinetId, id)),
    db.select().from(invoices).where(eq(invoices.cabinetId, id)),
    db.select().from(invoiceItems).where(eq(invoiceItems.cabinetId, id)),
    db.select().from(fiscalDeadlines).where(eq(fiscalDeadlines.cabinetId, id)),
    db.select().from(workflows).where(eq(workflows.cabinetId, id)),
    db.select().from(workflowTasks).where(eq(workflowTasks.cabinetId, id)),
    db.select().from(workflowTemplates).where(eq(workflowTemplates.cabinetId, id)),
    db.select().from(workflowTemplateTasks).where(eq(workflowTemplateTasks.cabinetId, id)),
    db.select().from(timeEntries).where(eq(timeEntries.cabinetId, id)),
    db.select().from(kycDocuments).where(eq(kycDocuments.cabinetId, id)),
    db.select().from(portalMessages).where(eq(portalMessages.cabinetId, id)),
    db.select().from(notifications).where(eq(notifications.cabinetId, id)),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    cabinet,
    data: {
      users: usersR, companies: companiesR, companyMembers: membersR, documents: documentsR,
      documentRequests: docReqR, invoices: invoicesR, invoiceItems: invoiceItemsR,
      fiscalDeadlines: deadlinesR, workflows: workflowsR, workflowTasks: wTasksR,
      workflowTemplates: wTemplatesR, workflowTemplateTasks: wTemplateTasksR,
      timeEntries: timeR, kycDocuments: kycR, portalMessages: msgR, notifications: notifR,
    },
  };

  await logPlatformAction({ admin, action: "CABINET_EXPORT", targetType: "cabinet", targetId: id, meta: { slug: cabinet.slug } });

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="export-${cabinet.slug}-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
