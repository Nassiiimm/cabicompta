import { db } from "@/lib/db";
import { cabinets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import type { Cabinet } from "@/lib/db/schema";

/**
 * Resolver de tenant — POINT D'ENTRÉE UNIQUE.
 *
 * v1 : le cabinet courant est déduit de l'utilisateur connecté
 * (users.cabinet_id). Pour ajouter plus tard une résolution par sous-domaine
 * (cabinet-x.domaine.app) ou domaine personnalisé, il suffit de modifier CE
 * fichier — aucun autre code n'a à changer.
 *
 * Pour le simple scoping des requêtes, `user.cabinetId` suffit. Utiliser
 * getCabinetContext() quand on a besoin du cabinet complet (branding, settings).
 */
export async function getCabinetContext(): Promise<{ cabinetId: string; cabinet: Cabinet } | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const [cabinet] = await db
    .select()
    .from(cabinets)
    .where(eq(cabinets.id, user.cabinetId))
    .limit(1);
  if (!cabinet) return null;

  return { cabinetId: cabinet.id, cabinet };
}

/** cabinetId du cabinet courant, ou null si non connecté. */
export async function getCabinetId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.cabinetId ?? null;
}
