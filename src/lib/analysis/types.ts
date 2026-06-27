// Types des résultats d'analyse IA (stockés dans documents.extractedData).
// Chaque type correspond à une spec et à une catégorie de document CabiCompta.

export type AnalysisKey =
  | "INVOICES"
  | "BANK_STATEMENT"
  | "PAYROLL_DAS"
  | "T4_RL1"
  | "T4A"
  | "SALES"
  | "FINANCIAL"
  | "FINANCIAL_DETAILED"
  | "GENERIC";

// ---- Factures (CTI/RTI) ----
export type InvoiceLine = {
  fournisseur: string;
  date: string;
  no_facture: string;
  description: string;
  montant_ht: number;
  tps: number;
  tvq: number;
  ttc: number;
  type: "service" | "achat" | "vente" | "mixte";
  categorie_cca: string | null;
};
export type InvoicesResult = {
  factures: InvoiceLine[];
  resume: { total_ht: number; total_tps: number; total_tvq: number; total_ttc: number };
  tronque?: boolean;
};

// ---- Relevé bancaire (transactions + détection Amazon FBA) ----
export type BankTransaction = {
  date: string;
  description: string;
  fournisseur: string;
  montant_ttc: number;
  type: "debit" | "credit";
  tps_tvq_applicable: boolean;
  raison: string;
  categorie: string;
  deductible_50: boolean;
};
export type AmazonFee = {
  description: string;
  montant_ht: number;
  tps_recuperable: number;
  tvq_recuperable: number;
  deductible: boolean;
};
export type BankStatementResult = {
  est_amazon_fba: boolean;
  compte?: string;
  periode?: string;
  transactions: BankTransaction[];
  amazon?: {
    periode_debut: string;
    periode_fin: string;
    revenus: { ventes_brutes: number; remboursements: number; autres_credits: number; total_revenus: number };
    frais: AmazonFee[];
    resume: {
      total_frais_ht: number; total_tps_recuperable: number; total_tvq_recuperable: number;
      profits_nets: number; montant_verse_vendeur: number;
    };
    note: string;
  };
  tronque?: boolean;
};

// ---- Paie / DAS ----
export type PayrollEmployee = {
  prenom: string; nom: string; nas: string;
  salaire_brut: number; impot_federal: number; impot_provincial: number;
};
export type PayrollResult = { periode: string; employes: PayrollEmployee[]; tronque?: boolean };

// ---- T4 / RL-1 ----
export type T4Employee = {
  prenom: string; nom: string; nas: string;
  salaire_brut: number; impot_federal: number; impot_quebec: number;
};
export type T4Result = { annee: number | null; employes: T4Employee[]; tronque?: boolean };

// ---- T4A ----
export type T4ABeneficiary = {
  nom: string; nas: string; neq: string; montant: number; case: "048" | "020"; impot: number;
};
export type T4AResult = { annee: number | null; beneficiaires: T4ABeneficiary[]; tronque?: boolean };

// ---- Ventes (méthode rapide TPS/TVQ) ----
export type SalesResult = { total_ventes_ttc: number; tronque?: boolean };

// ---- États financiers (T2 / CO-17) ----
export type FinancialResult = {
  revenus: { exploitation: number; placement: number; gains_capital: number; autres: number };
  depenses: Record<string, number>;
  tronque?: boolean;
};

// ---- États financiers détaillés (bilan complet) ----
export type FinancialDetailedResult = { donnees: Record<string, number>; tronque?: boolean };

// ---- Générique (classification + extraction libre) ----
export type GenericResult = { category: string; data: Record<string, unknown> };

export type AnalysisResult =
  | InvoicesResult | BankStatementResult | PayrollResult | T4Result
  | T4AResult | SalesResult | FinancialResult | FinancialDetailedResult | GenericResult;

// Enveloppe stockée dans documents.extractedData : on garde la clé d'analyse pour
// que l'UI sache quel composant de rendu utiliser.
export type StoredAnalysis = {
  analysisKey: AnalysisKey;
  analyzedAt: string;       // ISO
  source: "web" | "poste";  // canal d'exécution
  result: AnalysisResult;
};
