import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  cabinets, users, workflowTemplates, workflowTemplateTasks,
  companies, companyMembers, documents, documentComments, documentRequests,
  invoices, invoiceItems, fiscalDeadlines, workflows, workflowTasks,
  timeEntries, kycDocuments, portalMessages, notifications, activitySessions,
  auditLogs, accessLogs,
} from "@/lib/db/schema";

const supabaseAdminClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Provisioning d'un nouveau cabinet (tenant) — cœur DB, testable.
 *
 * Crée, dans UNE transaction : la fiche cabinet, son premier utilisateur ADMIN
 * (lié à un compte d'authentification déjà créé en amont via `admin.authId`),
 * et quelques modèles de workflow par défaut. Tout est stampé du cabinet_id.
 *
 * La création du compte Supabase Auth est faite par l'appelant (endpoint) et
 * `authId` est transmis ici — ce qui garde cette fonction pure-DB.
 */

const DEFAULT_TEMPLATES: { name: string; tasks: string[] }[] = [
  {
    name: "Déclaration société (T2 / CO-17)",
    tasks: [
      "Collecte des documents",
      "Préparation des états financiers",
      "Préparation T2 (fédéral)",
      "Préparation CO-17 (Québec)",
      "Révision",
      "Transmission",
    ],
  },
  {
    name: "TPS / TVQ",
    tasks: ["Collecte des relevés", "Calcul des taxes", "Production", "Confirmation de production"],
  },
  {
    name: "Fin d'année",
    tasks: ["Balance de vérification", "Régularisations", "États financiers", "Dossier permanent"],
  },
];

export type ProvisionInput = {
  name: string;
  slug: string;
  legalName?: string;
  admin: { authId: string; email: string; name: string };
};

export async function provisionCabinet(
  input: ProvisionInput
): Promise<{ cabinetId: string; adminUserId: string }> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [cab] = await tx
      .insert(cabinets)
      .values({
        slug: input.slug,
        name: input.name,
        legalName: input.legalName ?? input.name,
        displayName: input.name,
      })
      .returning({ id: cabinets.id });

    const [admin] = await tx
      .insert(users)
      .values({
        cabinetId: cab.id,
        authId: input.admin.authId,
        email: input.admin.email,
        name: input.admin.name,
        role: "ADMIN",
      })
      .returning({ id: users.id });

    for (const tpl of DEFAULT_TEMPLATES) {
      const [t] = await tx
        .insert(workflowTemplates)
        .values({ cabinetId: cab.id, name: tpl.name, createdBy: admin.id })
        .returning({ id: workflowTemplates.id });

      await tx.insert(workflowTemplateTasks).values(
        tpl.tasks.map((title, i) => ({
          cabinetId: cab.id,
          templateId: t.id,
          title,
          order: i,
        }))
      );
    }

    return { cabinetId: cab.id, adminUserId: admin.id };
  });
}

/**
 * Provisioning complet : crée le compte Supabase Auth du 1er admin PUIS le
 * cabinet (transaction). Rollback du compte Auth si l'écriture DB échoue (pas
 * d'orphelin). Réutilisé par l'endpoint API (secret) ET la console /platform.
 */
export async function provisionCabinetWithAdmin(input: {
  name: string;
  slug: string;
  legalName?: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}): Promise<{ cabinetId: string; adminUserId: string }> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: input.adminEmail,
    password: input.adminPassword,
    email_confirm: true,
    user_metadata: { name: input.adminName },
  });
  if (authError || !authUser.user) {
    throw new Error(authError?.message ?? "Échec création du compte admin");
  }

  try {
    return await provisionCabinet({
      name: input.name,
      slug: input.slug,
      legalName: input.legalName,
      admin: { authId: authUser.user.id, email: input.adminEmail, name: input.adminName },
    });
  } catch (dbErr) {
    // Rollback du compte Auth → pas de compte orphelin
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id).catch(() => {});
    throw dbErr;
  }
}

/**
 * Supprime DÉFINITIVEMENT un cabinet : toutes ses données (ordre FK), puis le
 * cabinet, puis les comptes Supabase Auth de tous ses utilisateurs. Irréversible.
 */
export async function deleteCabinet(cabinetId: string): Promise<void> {
  const db = getDb();
  // Comptes Auth à supprimer (récupérés avant la purge DB)
  const usersRows = await db
    .select({ authId: users.authId })
    .from(users)
    .where(eq(users.cabinetId, cabinetId));

  // Purge des tables tenant (enfants → parents)
  const tenantTables = [
    invoiceItems, invoices, documents, fiscalDeadlines, documentComments,
    documentRequests, workflowTasks, workflowTemplateTasks, timeEntries,
    kycDocuments, portalMessages, notifications, activitySessions,
    accessLogs, auditLogs, workflows, workflowTemplates, companyMembers,
    companies, users,
  ];
  for (const t of tenantTables) {
    await db.delete(t).where(eq(t.cabinetId, cabinetId));
  }
  await db.delete(cabinets).where(eq(cabinets.id, cabinetId));

  // Comptes d'authentification (client construit seulement s'il y en a à supprimer)
  const authIds = usersRows.map((u) => u.authId).filter((x): x is string => !!x);
  if (authIds.length > 0) {
    const supabaseAdmin = supabaseAdminClient();
    for (const aid of authIds) await supabaseAdmin.auth.admin.deleteUser(aid).catch(() => {});
  }
}
