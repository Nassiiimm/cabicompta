/**
 * Templates de workflow par type d'obligation fiscale.
 * Définit les étapes de travail et les documents requis pour chaque filing.
 */

export type TaskTemplate = {
  title: string;
  description?: string;
  estimatedMinutes: number;
  order: number;
  assignee: "STAFF" | "CLIENT";
};

export type DocRequestTemplate = {
  label: string;
  description?: string;
  required: boolean;
};

export type FiscalWorkflowTemplate = {
  tasks: TaskTemplate[];
  documentRequests: DocRequestTemplate[];
};

const TEMPLATES: Record<string, FiscalWorkflowTemplate> = {
  T2: {
    tasks: [
      { order: 1, title: "Réceptionner les états financiers", estimatedMinutes: 15, assignee: "STAFF" },
      { order: 2, title: "Préparer le bilan et l'état des résultats", estimatedMinutes: 120, assignee: "STAFF" },
      { order: 3, title: "Compléter le formulaire T2", estimatedMinutes: 90, assignee: "STAFF" },
      { order: 4, title: "Réviser la déclaration", estimatedMinutes: 30, assignee: "STAFF" },
      { order: 5, title: "Soumettre via TED (ARC)", estimatedMinutes: 15, assignee: "STAFF" },
      { order: 6, title: "Archiver la confirmation de dépôt", estimatedMinutes: 10, assignee: "STAFF" },
    ],
    documentRequests: [
      { label: "Relevés bancaires (tous les mois de l'exercice)", required: true },
      { label: "Factures de ventes / revenus", required: true },
      { label: "Factures de dépenses / achats", required: true },
      { label: "Relevés de prêts et emprunts", required: true },
      { label: "Tableau d'amortissement des immobilisations", required: false },
      { label: "Contrats de location / bail", required: false },
      { label: "Tout autre document comptable pertinent", required: false },
    ],
  },

  CO17: {
    tasks: [
      { order: 1, title: "Préparer la déclaration CO-17 (Québec)", estimatedMinutes: 60, assignee: "STAFF" },
      { order: 2, title: "Vérifier la concordance avec le T2", estimatedMinutes: 30, assignee: "STAFF" },
      { order: 3, title: "Soumettre via ImpôtNet (Revenu Québec)", estimatedMinutes: 15, assignee: "STAFF" },
      { order: 4, title: "Archiver la confirmation", estimatedMinutes: 10, assignee: "STAFF" },
    ],
    documentRequests: [],
  },

  TPS_TVQ: {
    tasks: [
      { order: 1, title: "Réceptionner les relevés bancaires du trimestre", estimatedMinutes: 10, assignee: "STAFF" },
      { order: 2, title: "Calculer les ventes taxables et les CTI/RTI", estimatedMinutes: 45, assignee: "STAFF" },
      { order: 3, title: "Compléter le formulaire FPZ-500 (Revenu Québec)", estimatedMinutes: 20, assignee: "STAFF" },
      { order: 4, title: "Transmettre la déclaration en ligne", estimatedMinutes: 10, assignee: "STAFF" },
      { order: 5, title: "Archiver la confirmation de dépôt", estimatedMinutes: 5, assignee: "STAFF" },
    ],
    documentRequests: [
      { label: "Relevés bancaires du trimestre", required: true },
      { label: "Registre des ventes (ou rapport de caisse)", required: true },
      { label: "Factures d'achats avec TPS/TVQ payée", required: true },
    ],
  },

  DAS: {
    tasks: [
      { order: 1, title: "Calculer les retenues du mois (impôt, RRQ, AE, RQAP)", estimatedMinutes: 30, assignee: "STAFF" },
      { order: 2, title: "Vérifier le registre de paie", estimatedMinutes: 15, assignee: "STAFF" },
      { order: 3, title: "Effectuer la remise (fédéral + provincial)", estimatedMinutes: 20, assignee: "STAFF" },
      { order: 4, title: "Confirmer le paiement et archiver", estimatedMinutes: 10, assignee: "STAFF" },
    ],
    documentRequests: [
      { label: "Rapport de paie du mois", required: true },
      { label: "Registre des employés (heures, salaires)", required: true },
    ],
  },

  T4: {
    tasks: [
      { order: 1, title: "Compiler les données de rémunération annuelles", estimatedMinutes: 60, assignee: "STAFF" },
      { order: 2, title: "Préparer les feuillets T4 par employé", estimatedMinutes: 45, assignee: "STAFF" },
      { order: 3, title: "Préparer le Sommaire T4", estimatedMinutes: 20, assignee: "STAFF" },
      { order: 4, title: "Préparer les relevés RL-1 (Québec)", estimatedMinutes: 30, assignee: "STAFF" },
      { order: 5, title: "Préparer le Sommaire RL-1", estimatedMinutes: 15, assignee: "STAFF" },
      { order: 6, title: "Transmettre par voie électronique (ARC + RQ)", estimatedMinutes: 20, assignee: "STAFF" },
      { order: 7, title: "Remettre les copies aux employés", estimatedMinutes: 10, assignee: "STAFF" },
    ],
    documentRequests: [
      { label: "Registre de paie annuel complet", required: true },
      { label: "Liste des employés avec NAS et adresses", required: true },
      { label: "Relevés de cotisations RRQ et AE", required: true },
      { label: "Avantages imposables (véhicule, assurance, etc.)", required: false },
    ],
  },

  T4_SUMMARY: {
    tasks: [
      { order: 1, title: "Vérifier le sommaire T4", estimatedMinutes: 15, assignee: "STAFF" },
      { order: 2, title: "Soumettre avec les feuillets T4", estimatedMinutes: 10, assignee: "STAFF" },
    ],
    documentRequests: [],
  },

  RL1: {
    tasks: [],
    documentRequests: [],
  },

  RL1_SUMMARY: {
    tasks: [],
    documentRequests: [],
  },

  CNESST: {
    tasks: [
      { order: 1, title: "Compiler la masse salariale annuelle", estimatedMinutes: 30, assignee: "STAFF" },
      { order: 2, title: "Compléter la déclaration CNESST en ligne", estimatedMinutes: 20, assignee: "STAFF" },
      { order: 3, title: "Archiver la confirmation", estimatedMinutes: 5, assignee: "STAFF" },
    ],
    documentRequests: [
      { label: "Masse salariale totale de l'année", required: true },
      { label: "Répartition par type d'emploi (si multiple)", required: false },
    ],
  },

  INSTALMENT: {
    tasks: [
      { order: 1, title: "Calculer le montant de l'acompte", estimatedMinutes: 20, assignee: "STAFF" },
      { order: 2, title: "Préparer le paiement (ARC + RQ)", estimatedMinutes: 15, assignee: "STAFF" },
      { order: 3, title: "Confirmer le paiement et archiver", estimatedMinutes: 5, assignee: "STAFF" },
    ],
    documentRequests: [],
  },

  REQ_ANNUAL: {
    tasks: [
      { order: 1, title: "Vérifier les informations au registre (dirigeants, adresse)", estimatedMinutes: 15, assignee: "CLIENT" },
      { order: 2, title: "Mettre à jour les informations si nécessaire", estimatedMinutes: 20, assignee: "STAFF" },
      { order: 3, title: "Soumettre la déclaration annuelle sur registreentreprises.qc.ca", estimatedMinutes: 10, assignee: "STAFF" },
      { order: 4, title: "Archiver la confirmation", estimatedMinutes: 5, assignee: "STAFF" },
    ],
    documentRequests: [
      { label: "Confirmation des dirigeants actuels (nom, adresse, titre)", required: true },
      { label: "Adresse d'établissement mise à jour", required: false },
    ],
  },

  T2_PAYMENT: {
    tasks: [
      { order: 1, title: "Calculer le solde d'impôt fédéral dû", estimatedMinutes: 15, assignee: "STAFF" },
      { order: 2, title: "Préparer le paiement (ARC)", estimatedMinutes: 10, assignee: "STAFF" },
      { order: 3, title: "Confirmer le paiement et archiver", estimatedMinutes: 5, assignee: "STAFF" },
    ],
    documentRequests: [],
  },

  CO17_PAYMENT: {
    tasks: [
      { order: 1, title: "Calculer le solde d'impôt provincial dû", estimatedMinutes: 15, assignee: "STAFF" },
      { order: 2, title: "Préparer le paiement (Revenu Québec)", estimatedMinutes: 10, assignee: "STAFF" },
      { order: 3, title: "Confirmer le paiement et archiver", estimatedMinutes: 5, assignee: "STAFF" },
    ],
    documentRequests: [],
  },

  TPS_TVQ_INSTALMENT: {
    tasks: [
      { order: 1, title: "Calculer l'acompte TPS/TVQ trimestriel", estimatedMinutes: 15, assignee: "STAFF" },
      { order: 2, title: "Effectuer le paiement (Revenu Québec)", estimatedMinutes: 10, assignee: "STAFF" },
      { order: 3, title: "Archiver la confirmation", estimatedMinutes: 5, assignee: "STAFF" },
    ],
    documentRequests: [],
  },
};

export function getTemplate(fiscalType: string): FiscalWorkflowTemplate {
  return TEMPLATES[fiscalType] ?? { tasks: [], documentRequests: [] };
}

/** Types à haut volume qu'on regroupe ou filtre pour éviter le bruit */
export const SILENT_TYPES = new Set(["T4_SUMMARY", "RL1", "RL1_SUMMARY"]);
