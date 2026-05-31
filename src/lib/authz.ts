import { db } from "@/lib/db";
import { companies, companyMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { AppUser } from "@/types";

/**
 * Contrôle d'accès à une entreprise (cloisonnement) — source unique de vérité.
 * - ADMIN / STAFF : accès complet (aucune requête).
 * - CLIENT  : doit être membre de l'entreprise (company_members).
 * - INTERN  : l'entreprise doit lui être assignée (companies.assigned_to).
 *
 * Centraliser ici évite d'oublier le contrôle sur une route (= faille).
 */
export async function hasCompanyAccess(
  user: Pick<AppUser, "id" | "role">,
  companyId: string
): Promise<boolean> {
  if (user.role === "ADMIN" || user.role === "STAFF") return true;

  if (user.role === "CLIENT") {
    const [m] = await db
      .select({ id: companyMembers.id })
      .from(companyMembers)
      .where(
        and(
          eq(companyMembers.userId, user.id),
          eq(companyMembers.companyId, companyId)
        )
      )
      .limit(1);
    return !!m;
  }

  if (user.role === "INTERN") {
    const [c] = await db
      .select({ assignedTo: companies.assignedTo })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    return !!c && c.assignedTo === user.id;
  }

  return false;
}
