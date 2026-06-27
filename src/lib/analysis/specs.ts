// SOURCE UNIQUE des analyseurs fiscaux (absorbés de FiscalAuto).
// Chaque spec = consigne (prompt) + normalisation de la sortie. Servie aux deux canaux :
//   - web   : src/app/api/analyze/[type] (Claude API)
//   - poste : src/app/api/ingest/analysis-specs (Claude Max du cabinet via MCP)
//
// Le LLM fait l'analyse ; `normalize` borne/arrondit la sortie pour un stockage fiable.

import { round2 } from "./json";
import type {
  AnalysisKey, AnalysisResult, InvoicesResult, BankStatementResult, PayrollResult,
  T4Result, T4AResult, SalesResult, FinancialResult, FinancialDetailedResult,
} from "./types";

export type AnalysisSpec = {
  key: AnalysisKey;
  label: string;
  /** Catégorie de document CabiCompta associée (documentCategory). */
  category: string;
  /** Consigne système (rôle + format JSON strict attendu). */
  systemPrompt: string;
  /** Instruction utilisateur courte jointe au document. */
  instruction: string;
  /** Réponse longue probable (gros relevés/états) → max_tokens élevé. */
  large?: boolean;
  /** Borne/arrondit la sortie brute du LLM. */
  normalize: (raw: Record<string, unknown>) => AnalysisResult;
};

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown): string => (v == null ? "" : String(v));
const nas9 = (v: unknown): string => str(v).replace(/\D/g, "").slice(0, 9);

// ───────────────────────── INVOICES (factures / CTI-RTI) ─────────────────────────
const INVOICES: AnalysisSpec = {
  key: "INVOICES",
  label: "Factures (CTI/RTI)",
  category: "INVOICE",
  large: true,
  systemPrompt: `Tu es un expert comptable québécois. Analyse chaque facture et retourne UNIQUEMENT un JSON valide sans markdown ni backticks:
{ "factures":[ { "fournisseur":"nom","date":"YYYY-MM-DD","no_facture":"numéro ou null","description":"description courte","montant_ht":0.00,"tps":0.00,"tvq":0.00,"ttc":0.00,"type":"service|achat|vente|mixte","categorie_cca":"catégorie DPA si bien amortissable (ex: Catégorie 10 - Véhicules), sinon null" } ],
  "resume":{ "total_ht":0.00,"total_tps":0.00,"total_tvq":0.00,"total_ttc":0.00 } }
type: "service" (transport, consultation, main d'oeuvre, abonnement, honoraires), "achat" (marchandises, produits, équipements, fournitures), "vente" (facture émise PAR le client), "mixte" (biens + services).
Si taxes non visibles: TPS=HT*0.05, TVQ=HT*0.09975. Si seul le TTC est connu: HT=TTC/1.14975.
Retourne TOUTES les factures sans exception; ne tronque jamais ta réponse.`,
  instruction: "Analyse ces factures et retourne le JSON demandé.",
  normalize: (d): InvoicesResult => {
    const factures = arr<Record<string, unknown>>(d.factures).map((f) => ({
      fournisseur: str(f.fournisseur) || "—",
      date: str(f.date) || "—",
      no_facture: f.no_facture && f.no_facture !== "null" ? str(f.no_facture) : "—",
      description: str(f.description) || "—",
      montant_ht: round2(f.montant_ht), tps: round2(f.tps), tvq: round2(f.tvq), ttc: round2(f.ttc),
      type: (["service", "achat", "vente", "mixte"].includes(str(f.type)) ? f.type : "achat") as InvoicesResult["factures"][number]["type"],
      categorie_cca: f.categorie_cca && f.categorie_cca !== "null" ? str(f.categorie_cca) : null,
    }));
    return {
      factures,
      resume: {
        total_ht: round2(factures.reduce((s, f) => s + f.montant_ht, 0)),
        total_tps: round2(factures.reduce((s, f) => s + f.tps, 0)),
        total_tvq: round2(factures.reduce((s, f) => s + f.tvq, 0)),
        total_ttc: round2(factures.reduce((s, f) => s + f.ttc, 0)),
      },
    };
  },
};

// ───────────────── BANK_STATEMENT (transactions + Amazon FBA) ─────────────────
const BANK_STATEMENT: AnalysisSpec = {
  key: "BANK_STATEMENT",
  label: "Relevé bancaire (CTI/RTI + Amazon FBA)",
  category: "BANK_STATEMENT",
  large: true,
  systemPrompt: `Tu es un expert comptable québécois.
ÉTAPE 1 — DÉTECTION: détermine si ce document est un RELEVÉ DE PAIEMENT AMAZON FBA/SELLER (indices: « Amazon », amazon.ca/.com, « Expédié par Amazon », FBA, « Commissions Amazon », Seller Central, frais d'abonnement vendeur, « Payé à Amazon »).
SI AMAZON FBA, retourne:
{ "est_amazon_fba":true, "amazon":{ "periode_debut":"YYYY-MM-DD","periode_fin":"YYYY-MM-DD","revenus":{"ventes_brutes":0,"remboursements":0,"autres_credits":0,"total_revenus":0},"frais":[{"description":"Commissions Amazon","montant_ht":0,"tps_recuperable":0,"tvq_recuperable":0,"deductible":true}],"resume":{"total_frais_ht":0,"total_tps_recuperable":0,"total_tvq_recuperable":0,"profits_nets":0,"montant_verse_vendeur":0},"note":"Vérifier la facture fiscale Amazon séparée." }, "transactions":[] }
Frais Amazon HORS TAXES: tps_recuperable=montant_ht*0.05, tvq_recuperable=montant_ht*0.09975. profits_nets=total_revenus-total_frais_ht.
SINON (relevé bancaire ordinaire), pour CHAQUE transaction:
- achat commercial -> tps_tvq_applicable OUI; transferts, dépôts, salaires, impôts/taxes gouvernementales, assurances, loyers résidentiels -> NON.
- catégorie: Carburant/transport | Repas et représentation | Fournitures de bureau | Téléphonie/Internet | Loyer/occupation | Services professionnels | Assurances | Salaires | Autre.
- deductible_50=true uniquement pour « Repas et représentation ».
Retourne: { "est_amazon_fba":false,"compte":"","periode":"","transactions":[{"date":"YYYY-MM-DD","description":"","fournisseur":"","montant_ttc":0,"type":"debit|credit","tps_tvq_applicable":true,"raison":"","categorie":"","deductible_50":false}] }
UNIQUEMENT le JSON strict. Retourne TOUTES les transactions; ne tronque jamais.`,
  instruction: "Détecte d'abord si c'est un relevé Amazon FBA, puis retourne le JSON demandé.",
  normalize: (d): BankStatementResult => {
    if (d.est_amazon_fba && d.amazon) {
      const a = d.amazon as Record<string, unknown>;
      const rv = (a.revenus || {}) as Record<string, unknown>;
      const rs = (a.resume || {}) as Record<string, unknown>;
      return {
        est_amazon_fba: true,
        transactions: [],
        amazon: {
          periode_debut: str(a.periode_debut), periode_fin: str(a.periode_fin),
          revenus: {
            ventes_brutes: round2(rv.ventes_brutes), remboursements: round2(rv.remboursements),
            autres_credits: round2(rv.autres_credits), total_revenus: round2(rv.total_revenus),
          },
          frais: arr<Record<string, unknown>>(a.frais).map((f) => {
            const ht = round2(f.montant_ht);
            return {
              description: str(f.description) || "Frais Amazon", montant_ht: ht,
              tps_recuperable: f.tps_recuperable != null ? round2(f.tps_recuperable) : round2(ht * 0.05),
              tvq_recuperable: f.tvq_recuperable != null ? round2(f.tvq_recuperable) : round2(ht * 0.09975),
              deductible: f.deductible !== false,
            };
          }),
          resume: {
            total_frais_ht: round2(rs.total_frais_ht), total_tps_recuperable: round2(rs.total_tps_recuperable),
            total_tvq_recuperable: round2(rs.total_tvq_recuperable), profits_nets: round2(rs.profits_nets),
            montant_verse_vendeur: round2(rs.montant_verse_vendeur),
          },
          note: str(a.note) || "Vérifier la facture fiscale Amazon séparée pour confirmation des taxes.",
        },
      };
    }
    return {
      est_amazon_fba: false,
      compte: str(d.compte), periode: str(d.periode),
      transactions: arr<Record<string, unknown>>(d.transactions).map((t) => ({
        date: str(t.date), description: str(t.description),
        fournisseur: str(t.fournisseur) || str(t.description) || "Transaction",
        montant_ttc: round2(t.montant_ttc),
        type: (t.type === "credit" ? "credit" : "debit") as "debit" | "credit",
        tps_tvq_applicable: !!t.tps_tvq_applicable, raison: str(t.raison),
        categorie: str(t.categorie) || "Autre", deductible_50: !!t.deductible_50,
      })),
    };
  },
};

// ───────────────────────── PAYROLL_DAS (paie) ─────────────────────────
const PAYROLL_DAS: AnalysisSpec = {
  key: "PAYROLL_DAS",
  label: "Paie / DAS",
  category: "DAS",
  systemPrompt: `Tu es un expert de la paie québécoise. À partir des feuilles de paie/relevés, extrais les employés et retourne UNIQUEMENT un JSON valide sans markdown:
{ "periode":"AAAA-MM ou texte","employes":[{"prenom":"","nom":"","nas":"123456789 ou vide","salaire_brut":0,"impot_federal":0,"impot_provincial":0}] }
salaire_brut = brut de la période; impot_federal/impot_provincial = impôt retenu si visible, sinon 0. Nombres en dollars. N'invente aucun employé.`,
  instruction: "Extrais les employés et leurs salaires de ces documents et retourne le JSON demandé.",
  normalize: (d): PayrollResult => ({
    periode: str(d.periode),
    employes: arr<Record<string, unknown>>(d.employes).map((e) => ({
      prenom: str(e.prenom), nom: str(e.nom), nas: nas9(e.nas),
      salaire_brut: round2(e.salaire_brut), impot_federal: round2(e.impot_federal), impot_provincial: round2(e.impot_provincial),
    })),
  }),
};

// ───────────────────────── T4_RL1 ─────────────────────────
const T4_RL1: AnalysisSpec = {
  key: "T4_RL1",
  label: "T4 / RL-1",
  category: "T4_RL1",
  systemPrompt: `Tu es un expert fiscal québécois (T4/RL-1). À partir des feuilles de paie annuelles et relevés DAS, extrais par employé les TOTAUX ANNUELS. Retourne UNIQUEMENT un JSON valide sans markdown:
{ "annee":2025,"employes":[{"prenom":"","nom":"","nas":"","salaire_brut":0,"impot_federal":0,"impot_quebec":0}] }
salaire_brut = revenus d'emploi annuels (case 14 / case A); impot_federal = case 22; impot_quebec = case E. Nombres en dollars.`,
  instruction: "Extrais les totaux annuels par employé et retourne le JSON demandé.",
  normalize: (d): T4Result => ({
    annee: d.annee ? Number(d.annee) : null,
    employes: arr<Record<string, unknown>>(d.employes).map((e) => ({
      prenom: str(e.prenom), nom: str(e.nom), nas: nas9(e.nas),
      salaire_brut: round2(e.salaire_brut), impot_federal: round2(e.impot_federal), impot_quebec: round2(e.impot_quebec),
    })),
  }),
};

// ───────────────────────── T4A ─────────────────────────
const T4A: AnalysisSpec = {
  key: "T4A",
  label: "T4A (sous-traitants)",
  category: "T4A",
  systemPrompt: `Tu es un expert fiscal québécois (T4A). À partir des factures de sous-traitants/contrats/relevés de paiements, extrais chaque bénéficiaire. Retourne UNIQUEMENT un JSON valide sans markdown:
{ "annee":2025,"beneficiaires":[{"nom":"","nas":"","neq":"","montant":0,"case":"048","impot":0}] }
case = "048" pour honoraires/services (défaut), "020" pour commissions. montant = total annuel payé; impot = case 022 si visible. nas pour un particulier, neq pour une entreprise. Nombres en dollars.`,
  instruction: "Extrais les bénéficiaires (sous-traitants) et retourne le JSON demandé.",
  normalize: (d): T4AResult => ({
    annee: d.annee ? Number(d.annee) : null,
    beneficiaires: arr<Record<string, unknown>>(d.beneficiaires).map((b) => ({
      nom: str(b.nom), nas: nas9(b.nas), neq: str(b.neq),
      montant: round2(b.montant), case: (b.case === "020" ? "020" : "048") as "048" | "020", impot: round2(b.impot),
    })),
  }),
};

// ───────────────────────── SALES (méthode rapide TPS/TVQ) ─────────────────────────
const SALES: AnalysisSpec = {
  key: "SALES",
  label: "Ventes (méthode rapide)",
  category: "TPS_TVQ",
  systemPrompt: `Tu es un expert comptable québécois. À partir des factures de ventes/relevés de caisse/sommaires, calcule le TOTAL des VENTES TTC (toutes taxes comprises) de la période. Retourne UNIQUEMENT: { "total_ventes_ttc":0.00 }
Additionne uniquement les ventes/revenus (pas les achats). Nombre en dollars, point décimal.`,
  instruction: "Calcule le total des ventes TTC et retourne le JSON demandé.",
  normalize: (d): SalesResult => ({ total_ventes_ttc: round2(d.total_ventes_ttc) }),
};

// ───────────────────────── FINANCIAL (T2 / CO-17) ─────────────────────────
const DEPENSE_KEYS = ["salaires", "loyer", "publicite", "fournitures", "vehicules", "assurances", "honoraires", "interets", "amortissement", "autres"];
const FINANCIAL: AnalysisSpec = {
  key: "FINANCIAL",
  label: "États financiers (T2/CO-17)",
  category: "T2",
  systemPrompt: `Tu es un expert comptable québécois. À partir des états financiers/grand livre/relevés, extrais UNIQUEMENT un JSON valide sans markdown:
{ "revenus":{"exploitation":0,"placement":0,"gains_capital":0,"autres":0},
  "depenses":{"salaires":0,"loyer":0,"publicite":0,"fournitures":0,"vehicules":0,"assurances":0,"honoraires":0,"interets":0,"amortissement":0,"autres":0} }
Regroupe chaque poste dans la catégorie la plus proche. Montants annuels en dollars; 0 si absent.`,
  instruction: "Analyse ces documents et retourne le JSON demandé.",
  normalize: (d): FinancialResult => {
    const rv = (d.revenus || {}) as Record<string, unknown>;
    const dp = (d.depenses || {}) as Record<string, unknown>;
    return {
      revenus: { exploitation: round2(rv.exploitation), placement: round2(rv.placement), gains_capital: round2(rv.gains_capital), autres: round2(rv.autres) },
      depenses: Object.fromEntries(DEPENSE_KEYS.map((k) => [k, round2(dp[k])])),
    };
  },
};

// ───────────────────────── FINANCIAL_DETAILED (bilan complet) ─────────────────────────
const ETATS_KEYS = [
  "er_revenus_exploitation", "er_autres_revenus", "er_stock_debut", "er_achats", "er_stock_fin",
  "er_salaires", "er_loyer", "er_publicite", "er_telephone", "er_fournitures", "er_vehicules",
  "er_assurances", "er_honoraires", "er_interets", "er_amortissement", "er_autres_charges", "er_provision_impots",
  "bil_encaisse", "bil_clients", "bil_stocks", "bil_charges_avance", "bil_immo_brutes", "bil_amort_cumule", "bil_autres_actifs",
  "bil_fournisseurs", "bil_tps_tvq", "bil_das", "bil_impots_payer", "bil_dette_ct", "bil_emprunts", "bil_autres_dettes",
  "bil_capital_actions", "bil_bnr_debut", "bil_dividendes",
  "flux_var_clients", "flux_var_stocks", "flux_var_fournisseurs", "flux_acquisition_immo", "flux_cession_immo",
  "flux_nouveaux_emprunts", "flux_remboursements", "flux_treso_debut",
];
const FINANCIAL_DETAILED: AnalysisSpec = {
  key: "FINANCIAL_DETAILED",
  label: "États financiers détaillés",
  category: "FINANCIAL_STATEMENT",
  large: true,
  systemPrompt: `Tu es un expert comptable québécois. À partir des états financiers/bilan/état des résultats/grand livre, extrais UNIQUEMENT un JSON valide sans markdown avec ces clés (montants annuels en dollars, 0 si absent):
{ ${ETATS_KEYS.map((k) => `"${k}":0`).join(",")} }
Regroupe chaque poste dans la clé la plus proche. "bil_amort_cumule" est un nombre positif.`,
  instruction: "Analyse ces documents et retourne le JSON demandé.",
  normalize: (d): FinancialDetailedResult => ({
    donnees: Object.fromEntries(ETATS_KEYS.map((k) => [k, round2(d[k])])),
  }),
};

// ───────────────────────── GENERIC (classification — = OCR existant) ─────────────────────────
const GENERIC: AnalysisSpec = {
  key: "GENERIC",
  label: "Classification automatique",
  category: "OTHER",
  systemPrompt: `Analyse ce document et retourne un JSON avec:
1. "category": une de: DAS, TPS_TVQ, FINANCIAL_STATEMENT, T1, T2, T4_RL1, T4A, REQ_DOC, IMMOBILISATION, BANK_STATEMENT, INVOICE, TAX_NOTICE, CORPORATE, CONTRACT, RECEIPT, OTHER
2. "data": données extraites. Pour une facture/reçu: vendor, invoiceNumber, date (YYYY-MM-DD), amountHt, tps, tvq, total, lineItems:[{description,quantity,unitPrice,amount}]. Sinon, paires clé-valeur pertinentes.
Contexte: cabinet comptable québécois. Retourne UNIQUEMENT le JSON, sans markdown.`,
  instruction: "Analyse ce document et retourne le JSON demandé.",
  normalize: (d) => ({
    category: typeof d.category === "string" ? d.category : "OTHER",
    data: (d.data && typeof d.data === "object" ? d.data : {}) as Record<string, unknown>,
  }),
};

export const ANALYSIS_SPECS: Record<AnalysisKey, AnalysisSpec> = {
  INVOICES, BANK_STATEMENT, PAYROLL_DAS, T4_RL1, T4A, SALES, FINANCIAL, FINANCIAL_DETAILED, GENERIC,
};

export function getSpec(key: string): AnalysisSpec | null {
  return (ANALYSIS_SPECS as Record<string, AnalysisSpec>)[key] ?? null;
}

/** Specs servies au canal poste (sans la fonction normalize, non sérialisable). */
export function publicSpecs() {
  return Object.values(ANALYSIS_SPECS).map(({ key, label, category, systemPrompt, instruction }) => ({
    key, label, category, systemPrompt, instruction,
  }));
}
