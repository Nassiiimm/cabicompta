import { db } from "@/lib/db";
import { cabinets } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import type { Cabinet } from "@/lib/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Exécute `fn` sous le rôle `app_tenant` avec le GUC `app.cabinet_id` positionné,
 * dans UNE transaction (même connexion) — ce qui ACTIVE la RLS (filet de sécurité
 * base) : toute requête de `fn` est automatiquement restreinte au cabinet, même
 * si un filtre applicatif a été oublié. Sans GUC, app_tenant ne voit aucune ligne.
 *
 * À utiliser pour les requêtes de DONNÉES tenant une fois la RLS activée. NE PAS
 * l'utiliser pour le bootstrap d'auth (getCurrentUser lit users par auth_id et
 * doit rester en `postgres`/propriétaire, hors RLS).
 *
 * Pré-requis : migration 0007 (rôle app_tenant + policies). Voir 0007_rls.sql.
 */
export async function withTenant<T>(cabinetId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.cabinet_id', ${cabinetId}, true)`);
    await tx.execute(sql`set local role app_tenant`);
    return fn(tx);
  });
}

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
