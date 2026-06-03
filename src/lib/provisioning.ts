import { getDb } from "@/lib/db";
import { cabinets, users, workflowTemplates, workflowTemplateTasks } from "@/lib/db/schema";

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
