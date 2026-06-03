/**
 * Pilote Automatique Fiscal — Moteur de génération
 *
 * Pour un client donné + une année :
 * 1. Génère toutes les échéances fiscales selon son profil
 * 2. Crée un workflow par échéance (avec les tâches prédéfinies)
 * 3. Crée les demandes documentaires liées à chaque workflow
 *
 * Idempotent : ne crée pas de doublons si déjà exécuté.
 */

import { db } from "@/lib/db";
import {
  companies,
  fiscalDeadlines,
  workflows,
  workflowTasks,
  documentRequests,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateFiscalDeadlines } from "@/lib/fiscal-calendar";
import { getTemplate, SILENT_TYPES } from "@/lib/autopilot-templates";

export type AutopilotResult = {
  companyId: string;
  companyName: string;
  deadlinesCreated: number;
  workflowsCreated: number;
  docRequestsCreated: number;
  skipped: number;
  error?: string;
};

export type CompanyFiscalProfile = {
  id: string;
  cabinetId: string;
  name: string;
  type: string | null;
  fiscalYearEnd: string | null;
  gstFiling: string | null;
  hasEmployees: boolean;
  hasInstallments: boolean;
};

/**
 * Filtre les échéances à générer selon le profil fiscal réel du client.
 * Évite de créer des obligations inexistantes (ex: DAS pour un client sans employés).
 */
function shouldGenerateType(
  type: string,
  profile: CompanyFiscalProfile
): boolean {
  // Toujours exclus s'ils sont couverts par le type parent
  if (SILENT_TYPES.has(type)) return false;

  // DAS et T4 uniquement si l'entreprise a des employés
  if (
    ["DAS", "T4", "T4_SUMMARY", "RL1", "RL1_SUMMARY", "CNESST"].includes(type) &&
    !profile.hasEmployees
  ) return false;

  // Acomptes provisionnels uniquement si activés
  if (
    ["INSTALMENT", "TPS_TVQ_INSTALMENT"].includes(type) &&
    !profile.hasInstallments
  ) return false;

  // TPS mensuelle uniquement si fréquence mensuelle
  // (par défaut les TPS_TVQ trimestriels sont générés pour tous)
  // TPS annuelle : on garde le Q4 uniquement
  if (type === "TPS_TVQ" && profile.gstFiling === "NONE") return false;

  return true;
}

/**
 * Lance le pilote automatique pour un client et une année.
 */
export async function runAutopilotForCompany(
  profile: CompanyFiscalProfile,
  year: number,
  assignedTo: string | null = null
): Promise<AutopilotResult> {
  const result: AutopilotResult = {
    companyId: profile.id,
    companyName: profile.name,
    deadlinesCreated: 0,
    workflowsCreated: 0,
    docRequestsCreated: 0,
    skipped: 0,
  };

  if (!profile.fiscalYearEnd) {
    result.error = "Date de fin d'exercice non définie";
    return result;
  }

  const allDeadlines = generateFiscalDeadlines(
    profile.fiscalYearEnd,
    year,
    profile.type
  );

  for (const d of allDeadlines) {
    if (!shouldGenerateType(d.type, profile)) {
      result.skipped++;
      continue;
    }

    // ── 1. Créer l'échéance si elle n'existe pas ───────────────────────
    const existingDeadline = await db
      .select({ id: fiscalDeadlines.id })
      .from(fiscalDeadlines)
      .where(
        and(
          eq(fiscalDeadlines.companyId, profile.id),
          eq(
            fiscalDeadlines.type,
            d.type as typeof fiscalDeadlines.type.enumValues[number]
          ),
          eq(fiscalDeadlines.period, d.period)
        )
      )
      .limit(1);

    let deadlineId: string;

    if (existingDeadline.length > 0) {
      deadlineId = existingDeadline[0].id;
    } else {
      const [inserted] = await db
        .insert(fiscalDeadlines)
        .values({
          cabinetId: profile.cabinetId,
          companyId: profile.id,
          type: d.type as typeof fiscalDeadlines.type.enumValues[number],
          label: d.label,
          period: d.period,
          dueDate: d.dueDate.toISOString().split("T")[0],
          status: "UPCOMING",
          notes: d.description,
        })
        .returning({ id: fiscalDeadlines.id });
      deadlineId = inserted.id;
      result.deadlinesCreated++;
    }

    // ── 2. Créer le workflow si pas encore lié à cette échéance ────────
    const existingWorkflow = await db
      .select({ id: workflows.id })
      .from(workflows)
      .where(eq(workflows.fiscalDeadlineId, deadlineId))
      .limit(1);

    if (existingWorkflow.length > 0) {
      result.skipped++;
      continue;
    }

    const template = getTemplate(d.type);

    const [newWorkflow] = await db
      .insert(workflows)
      .values({
        cabinetId: profile.cabinetId,
        companyId: profile.id,
        fiscalDeadlineId: deadlineId,
        name: d.label,
        status: "NOT_STARTED",
        assignedTo,
        dueDate: d.dueDate.toISOString().split("T")[0],
        fiscalPeriod: d.period,
      })
      .returning({ id: workflows.id });

    result.workflowsCreated++;

    // ── 3. Créer les tâches du workflow ────────────────────────────────
    if (template.tasks.length > 0) {
      await db.insert(workflowTasks).values(
        template.tasks.map((t) => ({
          cabinetId: profile.cabinetId,
          workflowId: newWorkflow.id,
          title: t.title,
          description: t.description ?? null,
          order: t.order,
          estimatedMinutes: t.estimatedMinutes,
          status: "TODO" as const,
        }))
      );
    }

    // ── 4. Créer les demandes documentaires ───────────────────────────
    if (template.documentRequests.length > 0) {
      await db.insert(documentRequests).values(
        template.documentRequests.map((r) => ({
          cabinetId: profile.cabinetId,
          workflowId: newWorkflow.id,
          companyId: profile.id,
          label: r.label,
          description: r.description ?? null,
          required: r.required,
          status: "PENDING",
          dueDate: d.dueDate.toISOString().split("T")[0],
        }))
      );
      result.docRequestsCreated += template.documentRequests.length;
    }
  }

  return result;
}

/**
 * Lance le pilote pour toutes les sociétés actives (ou une liste spécifique).
 */
export async function runAutopilot(
  cabinetId: string,
  year: number,
  companyIds?: string[],
  assignedTo?: string | null
): Promise<AutopilotResult[]> {
  const query = db
    .select({
      id: companies.id,
      cabinetId: companies.cabinetId,
      name: companies.name,
      type: companies.type,
      fiscalYearEnd: companies.fiscalYearEnd,
      gstFiling: companies.gstFiling,
      hasEmployees: companies.hasEmployees,
      hasInstallments: companies.hasInstallments,
    })
    .from(companies)
    .where(and(eq(companies.status, "ACTIVE"), eq(companies.cabinetId, cabinetId)));

  const allCompanies = await query;

  const targets = companyIds
    ? allCompanies.filter((c) => companyIds.includes(c.id))
    : allCompanies;

  const results: AutopilotResult[] = [];

  for (const company of targets) {
    const result = await runAutopilotForCompany(
      {
        ...company,
        fiscalYearEnd: company.fiscalYearEnd
          ? String(company.fiscalYearEnd)
          : null,
      },
      year,
      assignedTo ?? null
    );
    results.push(result);
  }

  return results;
}
