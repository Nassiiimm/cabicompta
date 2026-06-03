// @vitest-environment node
//
// PREUVE de la RLS (P7) — filet de sécurité au niveau BASE.
// Sème 2 cabinets (en propriétaire, hors RLS), puis interroge via withTenant()
// (sous le rôle app_tenant + GUC app.cabinet_id) et prouve que la base elle-même
// empêche A de voir B — même sans filtre applicatif. Skippé si base locale absente.
//
// Pré-requis : base locale synchronisée + migration 0007 appliquée.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/cabicompta_dev";

const { db } = await import("@/lib/db");
const { withTenant } = await import("@/lib/tenant");
const schema = await import("@/lib/db/schema");
const { eq, inArray, sql } = await import("drizzle-orm");

const { cabinets, users, companies } = schema;

let dbReady = false;
try {
  // Vérifie aussi que la RLS (0007) est appliquée : la policy doit exister.
  const r = await db.execute(sql`select count(*)::int as n from pg_policies where policyname = 'tenant_isolation'`);
  const n = (r as unknown as { n: number }[])[0]?.n ?? 0;
  dbReady = n > 0;
  if (!dbReady) console.warn("[rls] Policies absentes (migration 0007 non appliquée) — test SKIPPÉ.");
} catch {
  console.warn("[rls] Base locale injoignable — test SKIPPÉ.");
}

const A = randomUUID();
const B = randomUUID();
const companyA = randomUUID();
const companyB = randomUUID();

describe.skipIf(!dbReady)("RLS — isolation au niveau base (P7)", () => {
  beforeAll(async () => {
    // Seed en propriétaire (hors withTenant → bypass RLS)
    for (const [id, companyId, tag] of [[A, companyA, "A"], [B, companyB, "B"]] as const) {
      await db.insert(cabinets).values({ id, slug: `rls-${tag}-${id.slice(0, 8)}`, name: `Cabinet ${tag}` });
      await db.insert(users).values({ id: randomUUID(), cabinetId: id, authId: `rls-auth-${id}`, email: `rls-${tag}-${id}@test.local`, name: `Admin ${tag}`, role: "ADMIN" });
      await db.insert(companies).values({ id: companyId, cabinetId: id, name: `Société ${tag}` });
    }
  });

  afterAll(async () => {
    for (const t of [companies, users]) {
      await db.delete(t).where(inArray(t.cabinetId, [A, B]));
    }
    await db.delete(cabinets).where(inArray(cabinets.id, [A, B]));
  });

  it("withTenant(A) ne voit QUE les sociétés du cabinet A", async () => {
    const rows = await withTenant(A, (tx) => tx.select({ id: companies.id }).from(companies));
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(companyA);
    expect(ids).not.toContain(companyB);
  });

  it("withTenant(A) ne peut PAS lire la société de B même par son id (bloqué par la base)", async () => {
    const rows = await withTenant(A, (tx) =>
      tx.select({ id: companies.id }).from(companies).where(eq(companies.id, companyB))
    );
    expect(rows.length).toBe(0);
  });

  it("withTenant(B) voit B mais jamais A", async () => {
    const rows = await withTenant(B, (tx) => tx.select({ id: companies.id }).from(companies));
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(companyB);
    expect(ids).not.toContain(companyA);
  });

  it("INSERT hors cabinet courant est refusé par la policy (WITH CHECK)", async () => {
    await expect(
      withTenant(A, (tx) =>
        tx.insert(companies).values({ cabinetId: B, name: "Intrusion" }).returning({ id: companies.id })
      )
    ).rejects.toThrow();
  });
});
