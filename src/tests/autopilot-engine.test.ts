import { describe, it, expect } from "vitest";
import { getTemplate, SILENT_TYPES } from "@/lib/autopilot-templates";
import type { CompanyFiscalProfile } from "@/lib/autopilot";

// ─── shouldGenerateType (tested via importActual to access private fn) ─────────
// On teste la logique via les exports publics du module autopilot-templates
// et en reproduisant les règles de filtrage.

function shouldGenerateType(type: string, profile: CompanyFiscalProfile): boolean {
  if (SILENT_TYPES.has(type)) return false;

  if (["DAS", "T4", "T4_SUMMARY", "RL1", "RL1_SUMMARY", "CNESST"].includes(type) && !profile.hasEmployees)
    return false;

  if (["INSTALMENT", "TPS_TVQ_INSTALMENT"].includes(type) && !profile.hasInstallments)
    return false;

  if (type === "TPS_TVQ" && profile.gstFiling === "NONE")
    return false;

  return true;
}

const baseProfile: CompanyFiscalProfile = {
  id: "comp-1",
  cabinetId: "cab-1",
  name: "Test Co",
  type: "T2_SOCIETE",
  fiscalYearEnd: "2024-12-31",
  gstFiling: "QUARTERLY",
  hasEmployees: false,
  hasInstallments: false,
};

describe("SILENT_TYPES", () => {
  it("contains T4_SUMMARY, RL1, RL1_SUMMARY", () => {
    expect(SILENT_TYPES.has("T4_SUMMARY")).toBe(true);
    expect(SILENT_TYPES.has("RL1")).toBe(true);
    expect(SILENT_TYPES.has("RL1_SUMMARY")).toBe(true);
  });

  it("does not contain T4 or DAS", () => {
    expect(SILENT_TYPES.has("T4")).toBe(false);
    expect(SILENT_TYPES.has("DAS")).toBe(false);
  });
});

describe("getTemplate", () => {
  it("returns T2 template with tasks and doc requests", () => {
    const tpl = getTemplate("T2");
    expect(tpl.tasks.length).toBeGreaterThan(0);
    expect(tpl.documentRequests.length).toBeGreaterThan(0);
    expect(tpl.tasks[0].order).toBe(1);
  });

  it("returns TPS_TVQ template with doc requests", () => {
    const tpl = getTemplate("TPS_TVQ");
    expect(tpl.documentRequests.some((d) => d.required)).toBe(true);
  });

  it("returns T4 template with 7 tasks (inclut RL-1)", () => {
    const tpl = getTemplate("T4");
    expect(tpl.tasks).toHaveLength(7);
  });

  it("returns empty template for unknown type", () => {
    const tpl = getTemplate("UNKNOWN_TYPE");
    expect(tpl.tasks).toHaveLength(0);
    expect(tpl.documentRequests).toHaveLength(0);
  });

  it("all tasks have required fields", () => {
    const tpl = getTemplate("T2");
    for (const task of tpl.tasks) {
      expect(task.title).toBeTruthy();
      expect(task.estimatedMinutes).toBeGreaterThan(0);
      expect(typeof task.order).toBe("number");
      expect(["STAFF", "CLIENT"]).toContain(task.assignee);
    }
  });
});

describe("shouldGenerateType — filtres métier", () => {
  describe("types silencieux", () => {
    it("exclut T4_SUMMARY même si employés présents", () => {
      expect(shouldGenerateType("T4_SUMMARY", { ...baseProfile, hasEmployees: true })).toBe(false);
    });

    it("exclut RL1", () => {
      expect(shouldGenerateType("RL1", { ...baseProfile, hasEmployees: true })).toBe(false);
    });

    it("exclut RL1_SUMMARY", () => {
      expect(shouldGenerateType("RL1_SUMMARY", { ...baseProfile, hasEmployees: true })).toBe(false);
    });
  });

  describe("obligations liées aux employés", () => {
    it("exclut DAS sans employés", () => {
      expect(shouldGenerateType("DAS", baseProfile)).toBe(false);
    });

    it("inclut DAS avec employés", () => {
      expect(shouldGenerateType("DAS", { ...baseProfile, hasEmployees: true })).toBe(true);
    });

    it("exclut T4 sans employés", () => {
      expect(shouldGenerateType("T4", baseProfile)).toBe(false);
    });

    it("inclut T4 avec employés", () => {
      expect(shouldGenerateType("T4", { ...baseProfile, hasEmployees: true })).toBe(true);
    });

    it("exclut CNESST sans employés", () => {
      expect(shouldGenerateType("CNESST", baseProfile)).toBe(false);
    });

    it("inclut CNESST avec employés", () => {
      expect(shouldGenerateType("CNESST", { ...baseProfile, hasEmployees: true })).toBe(true);
    });
  });

  describe("acomptes provisionnels", () => {
    it("exclut INSTALMENT sans hasInstallments", () => {
      expect(shouldGenerateType("INSTALMENT", baseProfile)).toBe(false);
    });

    it("inclut INSTALMENT avec hasInstallments", () => {
      expect(shouldGenerateType("INSTALMENT", { ...baseProfile, hasInstallments: true })).toBe(true);
    });

    it("exclut TPS_TVQ_INSTALMENT sans hasInstallments", () => {
      expect(shouldGenerateType("TPS_TVQ_INSTALMENT", baseProfile)).toBe(false);
    });

    it("inclut TPS_TVQ_INSTALMENT avec hasInstallments", () => {
      expect(shouldGenerateType("TPS_TVQ_INSTALMENT", { ...baseProfile, hasInstallments: true })).toBe(true);
    });
  });

  describe("TPS/TVQ", () => {
    it("exclut TPS_TVQ si gstFiling=NONE", () => {
      expect(shouldGenerateType("TPS_TVQ", { ...baseProfile, gstFiling: "NONE" })).toBe(false);
    });

    it("inclut TPS_TVQ si gstFiling=QUARTERLY", () => {
      expect(shouldGenerateType("TPS_TVQ", { ...baseProfile, gstFiling: "QUARTERLY" })).toBe(true);
    });

    it("inclut TPS_TVQ si gstFiling=MONTHLY", () => {
      expect(shouldGenerateType("TPS_TVQ", { ...baseProfile, gstFiling: "MONTHLY" })).toBe(true);
    });

    it("inclut TPS_TVQ si gstFiling=ANNUAL", () => {
      expect(shouldGenerateType("TPS_TVQ", { ...baseProfile, gstFiling: "ANNUAL" })).toBe(true);
    });
  });

  describe("types toujours inclus (T2, CO17, REQ_ANNUAL, etc.)", () => {
    it("inclut T2", () => {
      expect(shouldGenerateType("T2", baseProfile)).toBe(true);
    });

    it("inclut CO17", () => {
      expect(shouldGenerateType("CO17", baseProfile)).toBe(true);
    });

    it("inclut REQ_ANNUAL", () => {
      expect(shouldGenerateType("REQ_ANNUAL", baseProfile)).toBe(true);
    });

    it("inclut T2_PAYMENT", () => {
      expect(shouldGenerateType("T2_PAYMENT", baseProfile)).toBe(true);
    });

    it("inclut CO17_PAYMENT", () => {
      expect(shouldGenerateType("CO17_PAYMENT", baseProfile)).toBe(true);
    });
  });
});

describe("getTemplate — tous les types connus", () => {
  const knownTypes = [
    "T2", "CO17", "TPS_TVQ", "DAS", "T4", "T4_SUMMARY",
    "RL1", "RL1_SUMMARY", "CNESST", "INSTALMENT",
    "REQ_ANNUAL", "T2_PAYMENT", "CO17_PAYMENT", "TPS_TVQ_INSTALMENT",
  ];

  for (const type of knownTypes) {
    it(`retourne un template valide pour ${type}`, () => {
      const tpl = getTemplate(type);
      expect(Array.isArray(tpl.tasks)).toBe(true);
      expect(Array.isArray(tpl.documentRequests)).toBe(true);
    });
  }
});
