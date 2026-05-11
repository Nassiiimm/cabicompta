import { describe, it, expect } from "vitest";
import { generateCsv } from "@/lib/csv";

const headers = [
  { key: "name", label: "Nom" },
  { key: "amount", label: "Montant" },
  { key: "status", label: "Statut" },
];

describe("generateCsv", () => {
  it("generates header row", () => {
    const csv = generateCsv(headers, []);
    expect(csv).toBe("Nom,Montant,Statut");
  });

  it("generates data rows", () => {
    const csv = generateCsv(headers, [
      { name: "Client A", amount: 1000, status: "PAID" },
      { name: "Client B", amount: 500, status: "SENT" },
    ]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("Client A,1000,PAID");
    expect(lines[2]).toBe("Client B,500,SENT");
  });

  it("escapes commas in values", () => {
    const csv = generateCsv(headers, [
      { name: "Tremblay, Jean", amount: 100, status: "OK" },
    ]);
    expect(csv).toContain('"Tremblay, Jean"');
  });

  it("escapes double quotes in values", () => {
    const csv = generateCsv(headers, [
      { name: 'Cabinet "Le Bon"', amount: 100, status: "OK" },
    ]);
    expect(csv).toContain('"Cabinet ""Le Bon"""');
  });

  it("escapes newlines in values", () => {
    const csv = generateCsv(headers, [
      { name: "Ligne 1\nLigne 2", amount: 100, status: "OK" },
    ]);
    expect(csv).toContain('"Ligne 1\nLigne 2"');
  });

  it("handles null and undefined values", () => {
    const csv = generateCsv(headers, [
      { name: null, amount: undefined, status: "OK" },
    ]);
    const lines = csv.split("\n");
    expect(lines[1]).toBe(",,OK");
  });

  it("handles empty rows array", () => {
    const csv = generateCsv(headers, []);
    expect(csv).toBe("Nom,Montant,Statut");
  });

  it("handles special characters (accents)", () => {
    const csv = generateCsv(headers, [
      { name: "Léveillé & Associés", amount: 100, status: "OK" },
    ]);
    expect(csv).toContain("Léveillé & Associés");
  });
});
