import { db } from "@/lib/db";
import { platformAdmins, platformAuditLogs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import type { PlatformAdmin } from "@/lib/db/schema";

/**
 * Renvoie l'administrateur PLATEFORME courant (super-admin) ou null.
 * Distinct de getCurrentUser (qui est scopé cabinet) : un super-admin n'a pas
 * de ligne dans `users` et n'appartient à aucun cabinet. Résolution directe
 * session Supabase → table platform_admins. Un compte désactivé (active=false)
 * est refusé.
 */
export async function getPlatformAdmin(): Promise<PlatformAdmin | null> {
  const session = await getSession();
  if (!session) return null;
  const [pa] = await db
    .select()
    .from(platformAdmins)
    .where(and(eq(platformAdmins.authId, session.id), eq(platformAdmins.active, true)))
    .limit(1);
  return pa ?? null;
}

/** Garde-fou : renvoie le super-admin ou lève — pour les actions/server actions. */
export async function requirePlatformAdmin(): Promise<PlatformAdmin> {
  const pa = await getPlatformAdmin();
  if (!pa) throw new Error("Forbidden");
  return pa;
}

/**
 * Trace une action plateforme (responsabilité). Fire-and-forget : ne bloque
 * jamais l'opération métier.
 */
export async function logPlatformAction(params: {
  admin: Pick<PlatformAdmin, "id" | "email"> | null;
  action: string;
  targetType?: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(platformAuditLogs).values({
      platformAdminId: params.admin?.id ?? null,
      actorEmail: params.admin?.email ?? null,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      meta: params.meta ?? null,
    });
  } catch {
    console.error("[PLATFORM_AUDIT] échec écriture du journal");
  }
}
