import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies, users } from "@/lib/db/schema";
import { eq, asc, isNull } from "drizzle-orm";
import { generateCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  try {
    await requireStaff();

    const rows = await db
      .select({
        name: companies.name,
        neq: companies.neq,
        arcNumber: companies.arcNumber,
        rqNumber: companies.rqNumber,
        fiscalYearEnd: companies.fiscalYearEnd,
        address: companies.address,
        city: companies.city,
        province: companies.province,
        postalCode: companies.postalCode,
        phone: companies.phone,
        email: companies.email,
        status: companies.status,
        kycVerified: companies.kycVerified,
        assignedName: users.name,
      })
      .from(companies)
      .leftJoin(users, eq(companies.assignedTo, users.id))
      .where(isNull(companies.deletedAt))
      .orderBy(asc(companies.name));

    const formatted = rows.map((r) => ({
      ...r,
      kycVerified: r.kycVerified ? "Oui" : "Non",
    }));

    const csv = generateCsv(
      [
        { key: "name", label: "Nom" },
        { key: "neq", label: "NEQ" },
        { key: "arcNumber", label: "Numéro ARC" },
        { key: "rqNumber", label: "Numéro RQ" },
        { key: "fiscalYearEnd", label: "Fin exercice" },
        { key: "address", label: "Adresse" },
        { key: "city", label: "Ville" },
        { key: "province", label: "Province" },
        { key: "postalCode", label: "Code postal" },
        { key: "phone", label: "Téléphone" },
        { key: "email", label: "Courriel" },
        { key: "status", label: "Statut" },
        { key: "kycVerified", label: "KYC vérifié" },
        { key: "assignedName", label: "Comptable assigné" },
      ],
      formatted
    );

    return csvResponse(csv, `clients-${new Date().toISOString().split("T")[0]}.csv`);
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
}
