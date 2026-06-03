import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies, documents } from "@/lib/db/schema";
import { ilike, or, and, isNull, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await requireStaff();
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (!q || q.length < 2) {
      return Response.json({ clients: [], documents: [] });
    }

    const pattern = `%${q}%`;

    const baseClientCondition = and(
      isNull(companies.deletedAt),
      or(
        ilike(companies.name, pattern),
        ilike(companies.neq, pattern),
        ilike(companies.email, pattern),
      )!
    );

    const clientCondition = and(
      eq(companies.cabinetId, user.cabinetId),
      user.role === "INTERN"
        ? and(baseClientCondition, eq(companies.assignedTo, user.id))
        : baseClientCondition
    );

    const clientList = await db
      .select({
        id: companies.id,
        name: companies.name,
        type: companies.type,
        status: companies.status,
      })
      .from(companies)
      .where(clientCondition)
      .limit(5);

    const docCondition = and(
      eq(documents.cabinetId, user.cabinetId),
      isNull(documents.deletedAt),
      ilike(documents.fileName, pattern)
    );

    const docList = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        category: documents.category,
        companyId: documents.companyId,
      })
      .from(documents)
      .where(docCondition)
      .limit(5);

    return Response.json({ clients: clientList, documents: docList });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
