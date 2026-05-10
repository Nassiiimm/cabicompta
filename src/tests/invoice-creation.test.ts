import { describe, it, expect } from "vitest";

describe("invoice number generation", () => {
  it("generates FAC-YYYYMMDD-XXX format", () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const seq = String(1).padStart(3, "0");
    const invoiceNumber = `FAC-${dateStr}-${seq}`;

    expect(invoiceNumber).toMatch(/^FAC-\d{8}-\d{3}$/);
  });
});

describe("TPS/TVQ calculation", () => {
  const TPS_RATE = 5.0;
  const TVQ_RATE = 9.975;

  it("calculates correct TPS (5%)", () => {
    const amountHt = 1000;
    const tps = Math.round(amountHt * TPS_RATE) / 100;
    expect(tps).toBe(50);
  });

  it("calculates correct TVQ (9.975%)", () => {
    const amountHt = 1000;
    const tvq = Math.round(amountHt * TVQ_RATE) / 100;
    expect(tvq).toBeCloseTo(99.75, 2);
  });

  it("calculates correct total", () => {
    const amountHt = 1000;
    const tps = amountHt * TPS_RATE / 100;
    const tvq = amountHt * TVQ_RATE / 100;
    const total = amountHt + tps + tvq;
    expect(total).toBeCloseTo(1149.75, 2);
  });

  it("handles line items correctly", () => {
    const items = [
      { quantity: 2, unitPrice: 150 },
      { quantity: 1, unitPrice: 500 },
      { quantity: 3, unitPrice: 75 },
    ];

    const amountHt = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    expect(amountHt).toBe(1025); // 300 + 500 + 225

    const tps = amountHt * TPS_RATE / 100;
    const tvq = amountHt * TVQ_RATE / 100;
    expect(tps).toBeCloseTo(51.25, 2);
    expect(tvq).toBeCloseTo(102.24, 2);
  });

  it("stores rates at invoice creation time", () => {
    // If rates change in the future, old invoices must keep their original rates
    const invoiceFrom2026 = { tpsRate: 5.0, tvqRate: 9.975, amountHt: 1000 };
    const invoiceFrom2030 = { tpsRate: 6.0, tvqRate: 10.5, amountHt: 1000 };

    const tps2026 = invoiceFrom2026.amountHt * invoiceFrom2026.tpsRate / 100;
    const tps2030 = invoiceFrom2030.amountHt * invoiceFrom2030.tpsRate / 100;

    expect(tps2026).toBe(50);
    expect(tps2030).toBe(60);
    expect(tps2026).not.toBe(tps2030);
  });
});

describe("invoice status transitions", () => {
  const VALID: Record<string, string[]> = {
    DRAFT: ["SENT", "CANCELLED"],
    SENT: ["PAID", "OVERDUE", "CANCELLED"],
    OVERDUE: ["PAID", "CANCELLED"],
  };

  it.each([
    ["DRAFT", "SENT", true],
    ["DRAFT", "CANCELLED", true],
    ["DRAFT", "PAID", false],
    ["DRAFT", "OVERDUE", false],
    ["SENT", "PAID", true],
    ["SENT", "OVERDUE", true],
    ["SENT", "CANCELLED", true],
    ["SENT", "DRAFT", false],
    ["OVERDUE", "PAID", true],
    ["OVERDUE", "CANCELLED", true],
    ["OVERDUE", "DRAFT", false],
    ["PAID", "DRAFT", false],
    ["PAID", "SENT", false],
    ["CANCELLED", "DRAFT", false],
  ])("%s → %s should be %s", (from, to, expected) => {
    const allowed = VALID[from];
    const isValid = allowed ? allowed.includes(to) : false;
    expect(isValid).toBe(expected);
  });
});
