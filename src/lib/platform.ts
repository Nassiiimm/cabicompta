import { db } from "@/lib/db";
import { platformAdmins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import type { PlatformAdmin } from "@/lib/db/schema";

/**
 * Renvoie l'administrateur PLATEFORME courant (super-admin) ou null.
 * Distinct de getCurrentUser (qui est scopé cabinet) : un super-admin n'a pas
 * de ligne dans `users` et n'appartient à aucun cabinet. Résolution directe
 * session Supabase → table platform_admins.
 */
export async function getPlatformAdmin(): Promise<PlatformAdmin | null> {
  const session = await getSession();
  if (!session) return null;
  const [pa] = await db
    .select()
    .from(platformAdmins)
    .where(eq(platformAdmins.authId, session.id))
    .limit(1);
  return pa ?? null;
}
