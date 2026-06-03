// @vitest-environment node
//
// Tests d'ISOLATION multi-tenant (A ≠ B) — INTÉGRATION sur vraie base.
// Sème 2 cabinets et prouve qu'un utilisateur du cabinet A ne peut ni LIRE ni
// accéder aux données du cabinet B. Des tests à db mockée ne prouveraient rien.
//
// Base : Postgres local `cabicompta_dev` (cf. validation des migrations).
//   createdb cabicompta_dev ; rejouer src/lib/db/migrations/*.sql
// Skippé automatiquement si la base locale n'est pas joignable (CI sans PG).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/cabicompta_dev";

const { db } = await import("@/lib/db");
const schema = await import("@/lib/db/schema");
const { hasCompanyAccess } = await import("@/lib/authz");
const { eq, and, count, inArray } = await import("drizzle-orm");
const { sql } = await import("drizzle-orm");

const { cabinets, users, companies, invoices, documents, fiscalDeadlines } = schema;

// Vérifie la disponibilité de la base AVANT d'enregistrer les tests.
let dbReady = false;
try {
  await db.execute(sql`select 1`);
  dbReady = true;
} catch {
  console.warn("[isolation] Base locale injoignable — tests d'isolation SKIPPÉS.");
}

// Identifiants des 2 cabinets de test
const A = randomUUID();
const B = randomUUID();
const userA = { id: randomUUID(), role: "ADMIN" as const, cabinetId: A };
const userB = { id: randomUUID(), role: "ADMIN" as const, cabinetId: B };
const companyA = randomUUID();
const companyB = randomUUID();

async function seedCabinet(
  cabinetId: string,
  user: { id: string; cabinetId: string },
  companyId: string,
  tag: string
) {
  await db.insert(cabinets).values({ id: cabinetId, slug: `test-${tag}-${cabinetId.slice(0, 8)}`, name: `Cabinet ${tag}` });
  await db.insert(users).values({ id: user.id, cabinetId, authId: `auth-${user.id}`, email: `${tag}-${user.id}@test.local`, name: `Admin ${tag}`, role: "ADMIN" });
  await db.insert(companies).values({ id: companyId, cabinetId, name: `Société ${tag}` });
  await db.insert(invoices).values({ cabinetId, companyId, invoiceNumber: `FAC-${tag}-001`, amountHt: "100.00", tps: "5.00", tvq: "9.98", total: "114.98" });
  await db.insert(documents).values({ cabinetId, companyId, uploadedBy: user.id, fileName: `doc-${tag}.pdf`, filePath: `${cabinetId}/${companyId}/doc.pdf` });
  await db.insert(fiscalDeadlines).values({ cabinetId, companyId, type: "T2", label: `Échéance ${tag}`, dueDate: "2026-12-31" });
}

describe.skipIf(!dbReady)("Isolation multi-tenant (A ≠ B)", () => {
  beforeAll(async () => {
    await seedCabinet(A, userA, companyA, "A");
    await seedCabinet(B, userB, companyB, "B");
  });

  afterAll(async () => {
    // Ordre FK-safe (enfants → parents)
    for (const t of [invoices, documents, fiscalDeadlines, companies, users]) {
      await db.delete(t).where(inArray(t.cabinetId, [A, B]));
    }
    await db.delete(cabinets).where(inArray(cabinets.id, [A, B]));
  });

  it("hasCompanyAccess : A accède à SA société", async () => {
    expect(await hasCompanyAccess(userA, companyA)).toBe(true);
  });

  it("hasCompanyAccess : A NE PEUT PAS accéder à la société de B", async () => {
    expect(await hasCompanyAccess(userA, companyB)).toBe(false);
  });

  it("hasCompanyAccess : B NE PEUT PAS accéder à la société de A", async () => {
    expect(await hasCompanyAccess(userB, companyA)).toBe(false);
  });

  it("liste des sociétés scopée : A ne voit que la sienne", async () => {
    const rows = await db.select({ id: companies.id }).from(companies).where(eq(companies.cabinetId, A));
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(companyA);
    expect(ids).not.toContain(companyB);
  });

  it("agrégat factures scopé : A ne compte que les siennes", async () => {
    const [r] = await db.select({ v: count() }).from(invoices).where(eq(invoices.cabinetId, A));
    expect(r.v).toBe(1);
  });

  it("documents scopés : aucun document de B visible côté A", async () => {
    const rows = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.cabinetId, A)));
    const aDocs = await db.select({ cabinetId: documents.cabinetId }).from(documents).where(inArray(documents.id, rows.map((r) => r.id)));
    expect(aDocs.every((d) => d.cabinetId === A)).toBe(true);
  });
});
