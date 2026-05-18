/**
 * Calendrier fiscal québécois — Obligations des sociétés
 *
 * Sources:
 * - Loi sur les impôts (L.R.Q., c. I-3)
 * - Loi sur la taxe de vente du Québec (L.R.Q., c. T-0.1)
 * - Loi de l'impôt sur le revenu (L.R.C., c. 1 (5e suppl.))
 * - Règlement sur les déclarations annuelles (REQ)
 */

import { addMonths, addDays, setMonth, setDate, endOfMonth, format, startOfYear, isBefore } from "date-fns";

export type FiscalDeadlineEntry = {
  type: string;
  label: string;
  period: string;
  dueDate: Date;
  description: string;
};

/**
 * Génère toutes les échéances fiscales pour une société québécoise
 * pour une année fiscale donnée.
 *
 * @param fiscalYearEnd - Date de fin d'exercice (ex: "2026-12-31")
 * @param year - Année pour laquelle générer les échéances
 */
export function generateFiscalDeadlines(
  fiscalYearEnd: string,
  year: number
): FiscalDeadlineEntry[] {
  const deadlines: FiscalDeadlineEntry[] = [];
  const fyEnd = new Date(fiscalYearEnd);
  // Adjust to the correct year
  const fyEndThisYear = new Date(year, fyEnd.getMonth(), fyEnd.getDate());

  // ═══════════════════════════════════════════════════════
  // 1. T2 — Déclaration de revenus des sociétés (fédéral)
  //    Art. 150(1) LIR: 6 mois après la fin de l'exercice
  // ═══════════════════════════════════════════════════════
  const t2Due = addMonths(fyEndThisYear, 6);
  deadlines.push({
    type: "T2",
    label: "T2 — Déclaration fédérale des sociétés",
    period: `${year}`,
    dueDate: t2Due,
    description:
      "Déclaration de revenus des sociétés (fédéral). Due 6 mois après la fin de l'exercice financier. Art. 150(1) LIR.",
  });

  // ═══════════════════════════════════════════════════════
  // 2. Paiement T2 — Solde d'impôt fédéral
  //    Art. 157(1) LIR: 2 mois après fin d'exercice
  //    (3 mois pour SPCC avec revenu imposable ≤ 500K$)
  // ═══════════════════════════════════════════════════════
  const t2PayDue = addMonths(fyEndThisYear, 2);
  deadlines.push({
    type: "T2_PAYMENT",
    label: "T2 — Paiement du solde d'impôt fédéral",
    period: `${year}`,
    dueDate: t2PayDue,
    description:
      "Solde d'impôt fédéral des sociétés. Dû 2 mois après la fin de l'exercice (3 mois pour SPCC admissibles). Art. 157(1) LIR.",
  });

  // ═══════════════════════════════════════════════════════
  // 3. CO-17 — Déclaration de revenus des sociétés (Québec)
  //    Art. 1000 LI: 6 mois après la fin de l'exercice
  // ═══════════════════════════════════════════════════════
  const co17Due = addMonths(fyEndThisYear, 6);
  deadlines.push({
    type: "CO17",
    label: "CO-17 — Déclaration provinciale des sociétés",
    period: `${year}`,
    dueDate: co17Due,
    description:
      "Déclaration de revenus des sociétés (Québec). Due 6 mois après la fin de l'exercice. Art. 1000 de la Loi sur les impôts (L.R.Q., c. I-3).",
  });

  // ═══════════════════════════════════════════════════════
  // 4. Paiement CO-17 — Solde d'impôt provincial
  //    Art. 1027 LI: 2 mois après fin d'exercice
  // ═══════════════════════════════════════════════════════
  const co17PayDue = addMonths(fyEndThisYear, 2);
  deadlines.push({
    type: "CO17_PAYMENT",
    label: "CO-17 — Paiement du solde d'impôt provincial",
    period: `${year}`,
    dueDate: co17PayDue,
    description:
      "Solde d'impôt provincial des sociétés. Dû 2 mois après la fin de l'exercice (3 mois pour SPCC admissibles). Art. 1027 LI.",
  });

  // ═══════════════════════════════════════════════════════
  // 5. TPS/TVQ — Déclarations trimestrielles
  //    Art. 238(1) LTA / Art. 468 LTVQ
  //    Trimestre → dû 1 mois après la fin du trimestre
  // ═══════════════════════════════════════════════════════
  const quarters = [
    { q: 1, label: "T1 (jan-mars)", monthEnd: 2, dueMonth: 3, dueDay: 30 },
    { q: 2, label: "T2 (avr-juin)", monthEnd: 5, dueMonth: 6, dueDay: 31 },
    { q: 3, label: "T3 (juil-sept)", monthEnd: 8, dueMonth: 9, dueDay: 31 },
    { q: 4, label: "T4 (oct-déc)", monthEnd: 11, dueMonth: 0, dueDay: 31 },
  ];

  for (const q of quarters) {
    const dueYear = q.q === 4 ? year + 1 : year;
    const due = new Date(dueYear, q.dueMonth, q.dueDay);

    deadlines.push({
      type: "TPS_TVQ",
      label: `TPS/TVQ — ${q.label}`,
      period: `${year}-Q${q.q}`,
      dueDate: due,
      description: `Déclaration et versement de la TPS (5%) et TVQ (9,975%) pour le ${q.label}. Art. 238(1) LTA et Art. 468 LTVQ.`,
    });
  }

  // ═══════════════════════════════════════════════════════
  // 6. Acomptes provisionnels — Impôt fédéral et provincial
  //    Art. 157(1)(a) LIR / Art. 1025 LI
  //    Mensuels, le dernier jour de chaque mois
  //    (obligatoires si impôt > 3 000 $ fédéral ou provincial)
  // ═══════════════════════════════════════════════════════
  for (let m = 0; m < 12; m++) {
    const monthDate = new Date(year, m, 1);
    const lastDay = endOfMonth(monthDate);
    deadlines.push({
      type: "INSTALMENT",
      label: `Acompte provisionnel — ${format(monthDate, "MMMM")}`,
      period: `${year}-${String(m + 1).padStart(2, "0")}`,
      dueDate: lastDay,
      description:
        "Acompte provisionnel mensuel (fédéral et provincial). Obligatoire si impôt de l'exercice précédent > 3 000 $. Art. 157(1)(a) LIR / Art. 1025 LI.",
    });
  }

  // ═══════════════════════════════════════════════════════
  // 7. DAS — Retenues à la source (fédéral + provincial)
  //    Art. 108(1) RPC, Art. 82 LAE, Art. 1015 LI
  //    Le 15 du mois suivant pour remises régulières
  // ═══════════════════════════════════════════════════════
  for (let m = 0; m < 12; m++) {
    const dueMonth = m + 1 > 11 ? 0 : m + 1;
    const dueYear = m + 1 > 11 ? year + 1 : year;
    deadlines.push({
      type: "DAS",
      label: `DAS — Retenues à la source ${format(new Date(year, m), "MMMM")}`,
      period: `${year}-${String(m + 1).padStart(2, "0")}`,
      dueDate: new Date(dueYear, dueMonth, 15),
      description:
        "Remise des retenues à la source (impôt, RRQ/RPC, AE, RQAP). Le 15 du mois suivant la rémunération. Art. 108(1) RPC / Art. 1015 LI.",
    });
  }

  // ═══════════════════════════════════════════════════════
  // 8. T4 / RL-1 — Feuillets de renseignements
  //    Art. 200(1) LIR / Art. 1086R1 RLI
  //    Le dernier jour de février de l'année suivante
  // ═══════════════════════════════════════════════════════
  const t4Due = new Date(year + 1, 1, 28); // Feb 28
  deadlines.push({
    type: "T4",
    label: "T4 — Feuillets de rémunération (fédéral)",
    period: `${year}`,
    dueDate: t4Due,
    description:
      "Production des feuillets T4 (État de la rémunération payée). Due le dernier jour de février de l'année suivante. Art. 200(1) LIR.",
  });

  deadlines.push({
    type: "T4_SUMMARY",
    label: "T4 Sommaire — Sommaire de la rémunération payée",
    period: `${year}`,
    dueDate: t4Due,
    description:
      "Production du sommaire T4 accompagnant les feuillets T4. Due le dernier jour de février de l'année suivante. Art. 200(1) LIR.",
  });

  deadlines.push({
    type: "RL1",
    label: "RL-1 — Relevés de rémunération (Québec)",
    period: `${year}`,
    dueDate: t4Due,
    description:
      "Production des relevés RL-1 (Revenus d'emploi et revenus divers). Due le dernier jour de février de l'année suivante. Art. 1086R1 du Règlement sur les impôts.",
  });

  deadlines.push({
    type: "RL1_SUMMARY",
    label: "RL-1 Sommaire — Sommaire des retenues et cotisations",
    period: `${year}`,
    dueDate: t4Due,
    description:
      "Production du sommaire RL-1 accompagnant les relevés RL-1. Due le dernier jour de février de l'année suivante.",
  });

  // ═══════════════════════════════════════════════════════
  // CNESST — Déclaration des salaires
  //    Avant le 15 mars de l'année suivante
  // ═══════════════════════════════════════════════════════
  deadlines.push({
    type: "CNESST",
    label: "CNESST — Déclaration des salaires",
    period: `${year}`,
    dueDate: new Date(year + 1, 2, 15), // 15 mars
    description:
      "Déclaration annuelle des salaires à la CNESST. Due le 15 mars de l'année suivante. Art. 34 LATMP.",
  });

  // ═══════════════════════════════════════════════════════
  // Acomptes provisionnels TPS/TVQ — trimestriels
  //    Art. 237 LTA / Art. 466 LTVQ
  // ═══════════════════════════════════════════════════════
  const tpsInstalments = [
    { q: 1, label: "T1 (jan–mars)", dueMonth: 3, dueDay: 30 },
    { q: 2, label: "T2 (avr–juin)", dueMonth: 6, dueDay: 31 },
    { q: 3, label: "T3 (juil–sept)", dueMonth: 9, dueDay: 31 },
    { q: 4, label: "T4 (oct–déc)", dueMonth: 0, dueDay: 31 },
  ];
  for (const q of tpsInstalments) {
    const dueYear = q.q === 4 ? year + 1 : year;
    deadlines.push({
      type: "TPS_TVQ_INSTALMENT",
      label: `Acompte TPS/TVQ — ${q.label}`,
      period: `${year}-Q${q.q}`,
      dueDate: new Date(dueYear, q.dueMonth, q.dueDay),
      description:
        `Acompte provisionnel trimestriel TPS/TVQ pour ${q.label}. Art. 237 LTA / Art. 466 LTVQ.`,
    });
  }

  // ═══════════════════════════════════════════════════════
  // 9. Déclaration annuelle REQ
  //    Loi sur la publicité légale des entreprises (L.R.Q., c. P-44.1)
  //    Mise à jour annuelle au Registraire des entreprises
  //    Date variable selon la date d'immatriculation
  // ═══════════════════════════════════════════════════════
  deadlines.push({
    type: "REQ_ANNUAL",
    label: "REQ — Déclaration annuelle de mise à jour",
    period: `${year}`,
    dueDate: new Date(year, 5, 15), // June 15 as default
    description:
      "Déclaration annuelle de mise à jour au Registraire des entreprises du Québec. Date limite variable selon la date d'immatriculation. Loi sur la publicité légale (L.R.Q., c. P-44.1).",
  });

  return deadlines;
}

/**
 * Règles de notification pour les échéances fiscales.
 * Envoie des rappels à 30, 14, 7 et 1 jour(s) avant l'échéance.
 */
export const REMINDER_DAYS = [30, 14, 7, 1] as const;

export function getReminderMessage(daysLeft: number, label: string): { title: string; message: string } {
  if (daysLeft <= 1) {
    return {
      title: `URGENT — ${label}`,
      message: `L'échéance est demain. Assurez-vous que tout est en ordre.`,
    };
  }
  if (daysLeft <= 7) {
    return {
      title: `Rappel — ${label}`,
      message: `Il reste ${daysLeft} jours avant cette échéance. Vérifiez que les documents sont prêts.`,
    };
  }
  if (daysLeft <= 14) {
    return {
      title: `Échéance approche — ${label}`,
      message: `Il reste ${daysLeft} jours. Préparez les documents nécessaires.`,
    };
  }
  return {
    title: `Échéance à venir — ${label}`,
    message: `Il reste ${daysLeft} jours pour ${label}. Planifiez en conséquence.`,
  };
}
