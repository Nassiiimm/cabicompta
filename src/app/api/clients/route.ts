import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { ilike, or, asc, isNull, and, eq } from "drizzle-orm";
import { z } from "zod";
import { generateInboxEmail } from "@/lib/inbox";
import { csrfGuard } from "@/lib/csrf";

const COMPANY_TYPES = ["T1_PARTICULIER", "T1_AUTONOME", "T2_SOCIETE"] as const;

const createCompanySchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(255),
  type: z.enum(COMPANY_TYPES).optional().nullable(),
  neq: z.string().max(20).optional().nullable(),
  arcNumber: z.string().max(20).optional().nullable(),
  rqNumber: z.string().max(20).optional().nullable(),
  fiscalYearEnd: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(50).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z
    .string()
    .email("Courriel invalide")
    .max(255)
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireStaff();

    const search = request.nextUrl.searchParams.get("search");

    const notDeleted = isNull(companies.deletedAt);
    const searchCondition = search
      ? and(
          notDeleted,
          or(
            ilike(companies.name, `%${search}%`),
            ilike(companies.neq, `%${search}%`),
            ilike(companies.email, `%${search}%`)
          )
        )
      : notDeleted;

    // Cloisonnement multi-tenant : uniquement les sociétés du cabinet courant
    const cabinetScope = eq(companies.cabinetId, user.cabinetId);
    // INTERN : seulement les clients qui lui sont assignés
    const conditions =
      user.role === "INTERN"
        ? and(cabinetScope, searchCondition, eq(companies.assignedTo, user.id))
        : and(cabinetScope, searchCondition);

    const result = await db
      .select()
      .from(companies)
      .where(conditions)
      .orderBy(asc(companies.name));
    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json(
      { error: "Erreur lors de la récupération des clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrf = csrfGuard(request);
    if (csrf) return csrf;
    const user = await requireStaff();

    const body = await request.json();
    const parsed = createCompanySchema.parse(body);

    // Clean empty strings to null
    const data = Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [
        key,
        value === "" ? null : value,
      ])
    ) as typeof parsed;

    // Auto-generate inbox email
    const inboxEmail = generateInboxEmail(data.name);

    const [company] = await db
      .insert(companies)
      .values({ ...data, inboxEmail, inboxActive: true, cabinetId: user.cabinetId })
      .returning();

    return Response.json(company, { status: 201 });
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
      { error: "Erreur lors de la création du client" },
      { status: 500 }
    );
  }
}
