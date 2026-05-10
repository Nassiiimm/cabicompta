import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies, documents, invoices, fiscalDeadlines } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const updateCompanySchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(255).optional(),
  neq: z.string().max(20).optional().nullable(),
  arcNumber: z.string().max(20).optional().nullable(),
  rqNumber: z.string().max(20).optional().nullable(),
  fiscalYearEnd: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(50).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email("Courriel invalide").max(255).optional().nullable().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();
    const { id } = await segmentData.params;

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    if (!company) {
      return Response.json({ error: "Client introuvable" }, { status: 404 });
    }

    return Response.json(company);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json(
      { error: "Erreur lors de la récupération du client" },
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

    // Get current state for audit
    const [current] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    if (!current) {
      return Response.json({ error: "Client introuvable" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateCompanySchema.parse(body);

    const data = Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, value === "" ? null : value])
    ) as typeof parsed;

    const [updated] = await db
      .update(companies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();

    // Audit log
    logAudit({
      userId: user.id,
      action: "UPDATE",
      tableName: "companies",
      recordId: id,
      oldData: current as unknown as Record<string, unknown>,
      newData: data as Record<string, unknown>,
    });

    return Response.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Erreur lors de la mise à jour du client" },
      { status: 500 }
    );
  }
}

// Soft delete — ne supprime jamais physiquement une société
export async function DELETE(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStaff();
    const { id } = await segmentData.params;

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    if (!company) {
      return Response.json({ error: "Client introuvable" }, { status: 404 });
    }

    const now = new Date();

    // Soft delete cascade : company + documents + invoices + fiscal deadlines
    await db
      .update(companies)
      .set({ deletedAt: now, status: "ARCHIVED", updatedAt: now })
      .where(eq(companies.id, id));

    await db
      .update(documents)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(documents.companyId, id));

    await db
      .update(invoices)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(invoices.companyId, id));

    await db
      .update(fiscalDeadlines)
      .set({ deletedAt: now })
      .where(eq(fiscalDeadlines.companyId, id));

    logAudit({
      userId: user.id,
      action: "SOFT_DELETE_CASCADE",
      tableName: "companies",
      recordId: id,
      oldData: { name: company.name, status: company.status },
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json(
      { error: "Erreur lors de la suppression du client" },
      { status: 500 }
    );
  }
}
