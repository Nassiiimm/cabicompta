import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { kycDocuments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createKycSchema = z.object({
  companyId: z.string().uuid(),
  adminName: z.string().min(1).max(255),
  adminRole: z.string().min(1).max(100),
  documentType: z.string().min(1).max(50),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    await requireStaff();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return Response.json(
        { error: "companyId requis" },
        { status: 400 }
      );
    }

    const docs = await db
      .select()
      .from(kycDocuments)
      .where(eq(kycDocuments.companyId, companyId));

    return Response.json(docs);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json(
      { error: "Erreur lors de la récupération des documents KYC" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireStaff();

    const body = await request.json();
    const parsed = createKycSchema.parse(body);

    const [doc] = await db
      .insert(kycDocuments)
      .values({
        companyId: parsed.companyId,
        adminName: parsed.adminName,
        adminRole: parsed.adminRole,
        documentType: parsed.documentType,
        notes: parsed.notes ?? null,
      })
      .returning();

    return Response.json(doc, { status: 201 });
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
      { error: "Erreur lors de la création du document KYC" },
      { status: 500 }
    );
  }
}
