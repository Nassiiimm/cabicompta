import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { invoices, invoiceItems, companies, companyMembers, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendInvoiceEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

const updateStatusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]),
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["PAID", "OVERDUE", "CANCELLED"],
  OVERDUE: ["PAID", "CANCELLED"],
};

export async function GET(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();
    const { id } = await segmentData.params;

    const [invoice] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        amountHt: invoices.amountHt,
        tps: invoices.tps,
        tvq: invoices.tvq,
        total: invoices.total,
        status: invoices.status,
        issuedAt: invoices.issuedAt,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
        notes: invoices.notes,
        createdAt: invoices.createdAt,
        companyId: invoices.companyId,
        companyName: companies.name,
        companyAddress: companies.address,
        companyCity: companies.city,
        companyProvince: companies.province,
        companyPostalCode: companies.postalCode,
        companyEmail: companies.email,
        companyPhone: companies.phone,
      })
      .from(invoices)
      .leftJoin(companies, eq(invoices.companyId, companies.id))
      .where(eq(invoices.id, id))
      .limit(1);

    if (!invoice) {
      return Response.json({ error: "Facture introuvable" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id));

    return Response.json({ ...invoice, items });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Non autorise" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Acces interdit" }, { status: 403 });
    }
    return Response.json(
      { error: "Erreur lors du chargement de la facture" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStaff();
    const { id } = await segmentData.params;

    const body = await request.json();
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Statut invalide", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status: newStatus } = parsed.data;

    // Check current invoice
    const [existing] = await db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (!existing) {
      return Response.json({ error: "Facture introuvable" }, { status: 404 });
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return Response.json(
        {
          error: `Transition de ${existing.status} vers ${newStatus} non permise`,
        },
        { status: 400 }
      );
    }

    const oldStatus = existing.status;
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === "SENT") {
      updateData.issuedAt = new Date();
    }
    if (newStatus === "PAID") {
      updateData.paidAt = new Date();
    }

    const [updated] = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();

    // Audit log
    logAudit({
      userId: user.id,
      action: "STATUS_CHANGE",
      tableName: "invoices",
      recordId: id,
      oldData: { status: oldStatus },
      newData: { status: newStatus },
    });

    // Send email when invoice is sent
    if (newStatus === "SENT") {
      const [inv] = await db
        .select({ companyId: invoices.companyId, invoiceNumber: invoices.invoiceNumber, total: invoices.total })
        .from(invoices)
        .where(eq(invoices.id, id))
        .limit(1);

      if (inv) {
        const members = await db
          .select({ userId: companyMembers.userId })
          .from(companyMembers)
          .where(eq(companyMembers.companyId, inv.companyId));

        for (const m of members) {
          const [u] = await db
            .select({ email: users.email, name: users.name })
            .from(users)
            .where(eq(users.id, m.userId))
            .limit(1);

          if (u) {
            const total = Number(inv.total).toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
            sendInvoiceEmail(u.email, u.name, inv.invoiceNumber, total);
          }
        }
      }
    }

    return Response.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Non autorise" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Acces interdit" }, { status: 403 });
    }
    return Response.json(
      { error: "Erreur lors de la mise a jour" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStaff();
    const { id } = await segmentData.params;

    const [existing] = await db
      .select({ id: invoices.id, status: invoices.status, invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (!existing) {
      return Response.json({ error: "Facture introuvable" }, { status: 404 });
    }

    if (existing.status !== "DRAFT") {
      return Response.json(
        { error: "Seules les factures en brouillon peuvent être archivées" },
        { status: 400 }
      );
    }

    // Soft delete — conservation légale 6 ans (Loi sur les impôts)
    await db
      .update(invoices)
      .set({ deletedAt: new Date(), status: "CANCELLED", updatedAt: new Date() })
      .where(eq(invoices.id, id));

    logAudit({
      userId: user.id,
      action: "SOFT_DELETE",
      tableName: "invoices",
      recordId: id,
      oldData: { status: existing.status, invoiceNumber: existing.invoiceNumber },
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Non autorise" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Acces interdit" }, { status: 403 });
    }
    return Response.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
