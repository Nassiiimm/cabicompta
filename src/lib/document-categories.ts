export const CATEGORY_LABELS: Record<string, string> = {
  DAS: "DAS",
  TPS_TVQ: "TPS/TVQ",
  FINANCIAL_STATEMENT: "État financier",
  T1: "T1",
  T2: "T2 / CO-17",
  T4_RL1: "T4 / RL-1",
  T4A: "T4A",
  REQ_DOC: "Doc. requis",
  IMMOBILISATION: "Immobilisation",
  BANK_STATEMENT: "Relevé bancaire",
  INVOICE: "Facture",
  TAX_NOTICE: "Avis d'imposition",
  CORPORATE: "Corporatif",
  CONTRACT: "Contrat",
  RECEIPT: "Reçu",
  OTHER: "Autre",
};

export const VALID_CATEGORIES = Object.keys(CATEGORY_LABELS);

export const SUBCATEGORIES_BY_CATEGORY: Record<string, string[]> = {
  DAS:                ["Mensuel", "Trimestriel", "Annuel"],
  TPS_TVQ:            ["Mensuelle", "Trimestrielle", "Annuelle"],
  FINANCIAL_STATEMENT:["Bilan", "État des résultats", "Flux de trésorerie", "Notes annexes"],
  T1:                 ["Fédéral", "Provincial"],
  T2:                 ["Fédéral (T2)", "Québec (CO-17)"],
  T4_RL1:             ["T4", "RL-1", "Sommaire"],
  T4A:                ["Honoraires", "Commissions"],
  REQ_DOC:            ["Pièce d'identité", "Preuve d'adresse", "Procuration", "Autre"],
  IMMOBILISATION:     ["Terrain", "Bâtiment", "Équipement", "Véhicule", "Autre"],
  BANK_STATEMENT:     ["Chèques", "Épargne", "Marge de crédit", "Carte de crédit"],
  INVOICE:            ["Fournisseur", "Client"],
  TAX_NOTICE:         ["Fédéral", "Provincial"],
  CORPORATE:          ["Résolutions", "Statuts", "Registres", "Déclaration annuelle"],
  CONTRACT:           ["Bail", "Service", "Emploi", "Autre"],
  RECEIPT:            ["Restaurant", "Hébergement", "Transport", "Représentation", "Fournitures", "Autre"],
  OTHER:              [],
};
