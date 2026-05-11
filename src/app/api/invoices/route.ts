import { requireStaff } from "@/lib/auth";
import { db, getDb } from "@/lib/db";
import { invoices, invoiceItems, companies } from "@/lib/db/schema";
import { eq, desc, and, isNull, count } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description requise"),
  quantity: z.number().positive("Quantite invalide"),
  unitPrice: z.number().min(0, "Prix unitaire invalide"),
});

const createInvoiceSchema = z.object({
  companyId: z.string().uuid("ID client invalide"),
  dueDate: z.string().min(1, "Date d'echeance requise"),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "Au moins un article requis"),
});

function generateInvoiceNumber(): string {
  const now = new Date();
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `FAC-${dateStr}-${seq}`;
}

const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;

export async function GET(request: Request) {
  try {
    await requireStaff();

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const companyIdFilter = searchParams.get("companyId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
    const offset = (page - 1) * limit;

    const filters = [isNull(invoices.deletedAt)];
    if (statusFilter && ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"].includes(statusFilter)) {
      filters.push(eq(invoices.status, statusFilter as "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED"));
    }
    if (companyIdFilter) {
      filters.push(eq(invoices.companyId, companyIdFilter));
    }
    const conditions = filters.length === 1 ? filters[0] : and(...filters);

    const [totalResult] = await db.select({ total: count() }).from(invoices).where(conditions);

    const result = await db
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
      })
      .from(invoices)
      .leftJoin(companies, eq(invoices.companyId, companies.id))
      .where(conditions)
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    return Response.json({ invoices: result, total: totalResult?.total ?? 0, page, limit });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Non autorise" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Acces interdit" }, { status: 403 });
    }
    return Response.json(
      { error: "Erreur lors du chargement des factures" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStaff();

    const body = await request.json();
    const parsed = createInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { companyId, dueDate, notes, items } = parsed.data;

    const computedItems = items.map((item) => ({
      ...item,
      amount: item.quantity * item.unitPrice,
    }));

    const amountHt = computedItems.reduce((sum, item) => sum + item.amount, 0);
    const tps = amountHt * TPS_RATE;
    const tvq = amountHt * TVQ_RATE;
    const total = amountHt + tps + tvq;

    const invoiceNumber = generateInvoiceNumber();

    // Transaction atomique — invoice + items ensemble
    const realDb = getDb();
    const result = await realDb.transaction(async (tx) => {
      const [newInvoice] = await tx
        .insert(invoices)
        .values({
          companyId,
          invoiceNumber,
          amountHt: amountHt.toFixed(2),
          tps: tps.toFixed(2),
          tvq: tvq.toFixed(2),
          total: total.toFixed(2),
          dueDate,
          notes: notes || null,
        })
        .returning();

      if (computedItems.length > 0) {
        await tx.insert(invoiceItems).values(
          computedItems.map((item) => ({
            invoiceId: newInvoice.id,
            description: item.description,
            quantity: item.quantity.toFixed(2),
            unitPrice: item.unitPrice.toFixed(2),
            amount: item.amount.toFixed(2),
          }))
        );
      }

      return newInvoice;
    });

    logAudit({
      userId: user.id,
      action: "CREATE",
      tableName: "invoices",
      recordId: result.id,
      newData: { invoiceNumber, companyId, total: total.toFixed(2) },
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Non autorise" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Acces interdit" }, { status: 403 });
    }
    console.error("Erreur creation facture:", error);
    return Response.json(
      { error: "Erreur lors de la creation de la facture" },
      { status: 500 }
    );
  }
}
