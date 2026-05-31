import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies, documents, invoices, fiscalDeadlines, workflows } from "@/lib/db/schema";
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
  type: z.enum(["T1_PARTICULIER", "T1_AUTONOME", "T2_SOCIETE"]).optional().nullable(),
  notes: z.string().optional().nullable(),
  // Informations bancaires — ADMIN/STAFF uniquement
  bankName: z.string().max(255).optional().nullable(),
  bankTransitNumber: z.string().max(20).optional().nullable(),
  bankInstitutionNumber: z.string().max(10).optional().nullable(),
  bankAccountNumber: z.string().max(50).optional().nullable(),
  bankOnlineId: z.string().max(255).optional().nullable(),
  bankPassword: z.string().optional().nullable(),
  // Portails gouvernementaux — ADMIN/STAFF uniquement
  clicsequrId: z.string().max(255).optional().nullable(),
  clicsequrPassword: z.string().optional().nullable(),
  arcId: z.string().max(255).optional().nullable(),
  arcPassword: z.string().optional().nullable(),
  cnesstId: z.string().max(255).optional().nullable(),
  cnesstPassword: z.string().optional().nullable(),
  reqId: z.string().max(255).optional().nullable(),
  reqPassword: z.string().optional().nullable(),
  serviceCanadaId: z.string().max(255).optional().nullable(),
  serviceCanadaPassword: z.string().optional().nullable(),
  // Profil fiscal — pilote automatique
  gstFiling: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL", "NONE"]).optional().nullable(),
  hasEmployees: z.boolean().optional(),
  employeeCount: z.number().int().min(0).optional().nullable(),
  hasInstallments: z.boolean().optional(),
});

export async function GET(
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

    if (user.role === "INTERN" && company.assignedTo !== user.id) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Masquer les informations sensibles pour les stagiaires
    if (user.role === "INTERN") {
      const { bankName, bankTransitNumber, bankInstitutionNumber, bankAccountNumber, bankOnlineId, bankPassword,
        clicsequrId, clicsequrPassword, arcId, arcPassword, cnesstId, cnesstPassword, reqId, reqPassword, serviceCanadaId, serviceCanadaPassword,
        ...safeCompany } = company;
      void bankName; void bankTransitNumber; void bankInstitutionNumber; void bankAccountNumber; void bankOnlineId; void bankPassword;
      void clicsequrId; void clicsequrPassword; void arcId; void arcPassword; void cnesstId; void cnesstPassword; void reqId; void reqPassword; void serviceCanadaId; void serviceCanadaPassword;
      return Response.json(safeCompany);
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

    if (user.role === "INTERN" && current.assignedTo !== user.id) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateCompanySchema.parse(body);

    // Retirer les champs sensibles pour les stagiaires
    if (user.role === "INTERN") {
      const sensitiveFields = ["bankName","bankTransitNumber","bankInstitutionNumber","bankAccountNumber","bankOnlineId","bankPassword",
        "clicsequrId","clicsequrPassword","arcId","arcPassword","cnesstId","cnesstPassword","reqId","reqPassword","serviceCanadaId","serviceCanadaPassword"];
      for (const f of sensitiveFields) delete (parsed as Record<string, unknown>)[f];
    }

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
    if (user.role === "INTERN") {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }
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

    await db
      .update(workflows)
      .set({ status: "CANCELLED", updatedAt: now })
      .where(eq(workflows.companyId, id));

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
