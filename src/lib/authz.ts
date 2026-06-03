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
  user: Pick<AppUser, "id" | "role" | "cabinetId">,
  companyId: string
): Promise<boolean> {
  // Garde-fou multi-tenant : on charge d'abord la société et on vérifie
  // qu'elle appartient AU cabinet de l'utilisateur. Un ADMIN/STAFF du cabinet A
  // ne doit jamais accéder à une société du cabinet B.
  const [c] = await db
    .select({ cabinetId: companies.cabinetId, assignedTo: companies.assignedTo })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!c || c.cabinetId !== user.cabinetId) return false;

  if (user.role === "ADMIN" || user.role === "STAFF") return true;

  if (user.role === "INTERN") return c.assignedTo === user.id;

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

  return false;
}
