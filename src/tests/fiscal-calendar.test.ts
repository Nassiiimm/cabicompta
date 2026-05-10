import { describe, it, expect } from "vitest";
import { generateFiscalDeadlines, getReminderMessage, REMINDER_DAYS } from "@/lib/fiscal-calendar";

describe("generateFiscalDeadlines", () => {
  const deadlines = generateFiscalDeadlines("2026-12-31", 2026);

  it("generates deadlines for a December year-end", () => {
    expect(deadlines.length).toBeGreaterThan(0);
  });

  it("includes T2 declaration due 6 months after year-end", () => {
    const t2 = deadlines.find((d) => d.type === "T2");
    expect(t2).toBeDefined();
    expect(t2!.dueDate.getMonth()).toBe(5); // June (0-indexed)
    expect(t2!.dueDate.getFullYear()).toBe(2027);
  });

  it("includes CO-17 declaration due 6 months after year-end", () => {
    const co17 = deadlines.find((d) => d.type === "CO17");
    expect(co17).toBeDefined();
    expect(co17!.dueDate.getMonth()).toBe(5);
    expect(co17!.dueDate.getFullYear()).toBe(2027);
  });

  it("includes T2 payment due 2 months after year-end", () => {
    const t2pay = deadlines.find((d) => d.type === "T2_PAYMENT");
    expect(t2pay).toBeDefined();
    expect(t2pay!.dueDate.getMonth()).toBe(1); // February
    expect(t2pay!.dueDate.getFullYear()).toBe(2027);
  });

  it("includes 4 quarterly TPS/TVQ deadlines", () => {
    const tpstvq = deadlines.filter((d) => d.type === "TPS_TVQ");
    expect(tpstvq).toHaveLength(4);
    expect(tpstvq.map((d) => d.period)).toContain("2026-Q1");
    expect(tpstvq.map((d) => d.period)).toContain("2026-Q4");
  });

  it("includes 12 monthly DAS deadlines", () => {
    const das = deadlines.filter((d) => d.type === "DAS");
    expect(das).toHaveLength(12);
  });

  it("includes 12 monthly instalment deadlines", () => {
    const inst = deadlines.filter((d) => d.type === "INSTALMENT");
    expect(inst).toHaveLength(12);
  });

  it("includes T4 and RL-1 due Feb 28 of next year", () => {
    const t4 = deadlines.find((d) => d.type === "T4");
    const rl1 = deadlines.find((d) => d.type === "RL1");
    expect(t4).toBeDefined();
    expect(rl1).toBeDefined();
    expect(t4!.dueDate.getMonth()).toBe(1); // February
    expect(t4!.dueDate.getFullYear()).toBe(2027);
  });

  it("includes REQ annual declaration", () => {
    const req = deadlines.find((d) => d.type === "REQ_ANNUAL");
    expect(req).toBeDefined();
  });

  it("handles March fiscal year-end correctly", () => {
    const marchDeadlines = generateFiscalDeadlines("2026-03-31", 2026);
    const t2 = marchDeadlines.find((d) => d.type === "T2");
    expect(t2).toBeDefined();
    expect(t2!.dueDate.getMonth()).toBe(8); // September
    expect(t2!.dueDate.getFullYear()).toBe(2026);
  });

  it("all deadlines have required fields", () => {
    for (const d of deadlines) {
      expect(d.type).toBeTruthy();
      expect(d.label).toBeTruthy();
      expect(d.period).toBeTruthy();
      expect(d.dueDate).toBeInstanceOf(Date);
      expect(d.description).toBeTruthy();
    }
  });
});

describe("getReminderMessage", () => {
  it("returns URGENT for 1 day left", () => {
    const { title } = getReminderMessage(1, "T2");
    expect(title).toContain("URGENT");
  });

  it("returns Rappel for 7 days left", () => {
    const { title } = getReminderMessage(7, "T2");
    expect(title).toContain("Rappel");
  });

  it("returns Échéance approche for 14 days left", () => {
    const { title } = getReminderMessage(14, "T2");
    expect(title).toContain("approche");
  });

  it("returns Échéance à venir for 30 days left", () => {
    const { title } = getReminderMessage(30, "T2");
    expect(title).toContain("venir");
  });
});

describe("REMINDER_DAYS", () => {
  it("has 4 reminder intervals", () => {
    expect(REMINDER_DAYS).toHaveLength(4);
  });

  it("is sorted descending", () => {
    for (let i = 0; i < REMINDER_DAYS.length - 1; i++) {
      expect(REMINDER_DAYS[i]).toBeGreaterThan(REMINDER_DAYS[i + 1]);
    }
  });
});
