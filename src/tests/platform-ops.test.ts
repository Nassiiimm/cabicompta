// @vitest-environment node
//
// Opérations plateforme (vraie base) : deleteCabinet (purge complète) +
// logPlatformAction (journal d'audit). Skippé si base locale absente.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/cabicompta_dev";

const { db } = await import("@/lib/db");
const { cabinets, users, companies, invoices, platformAuditLogs, platformAdmins } = await import("@/lib/db/schema");
const { deleteCabinet } = await import("@/lib/provisioning");
const { logPlatformAction } = await import("@/lib/platform");
const { eq, count, sql } = await import("drizzle-orm");

let dbReady = false;
try {
  const r = await db.execute(sql`select to_regclass('public.platform_audit_logs') as t`);
  dbReady = !!(r as unknown as { t: string | null }[])[0]?.t;
} catch { /* skip */ }

const A = randomUUID();

describe.skipIf(!dbReady)("Opérations plateforme", () => {
  afterAll(async () => {
    // sécurité si un test a échoué avant la purge
    for (const t of [invoices, companies, users]) await db.delete(t).where(eq(t.cabinetId, A));
    await db.delete(cabinets).where(eq(cabinets.id, A));
  });

  it("deleteCabinet purge le cabinet et toutes ses données", async () => {
    // Seed (users.authId = null → deleteCabinet ne touche pas Supabase Auth)
    await db.insert(cabinets).values({ id: A, slug: `del-${A.slice(0, 8)}`, name: "À supprimer" });
    await db.insert(users).values({ cabinetId: A, authId: null, email: `del-${A}@t.local`, name: "U", role: "ADMIN" });
    const [c] = await db.insert(companies).values({ cabinetId: A, name: "Soc" }).returning({ id: companies.id });
    await db.insert(invoices).values({ cabinetId: A, companyId: c.id, invoiceNumber: "INV-DEL", amountHt: "1", tps: "0", tvq: "0", total: "1" });

    await deleteCabinet(A);

    const [cab] = await db.select({ v: count() }).from(cabinets).where(eq(cabinets.id, A));
    const [usr] = await db.select({ v: count() }).from(users).where(eq(users.cabinetId, A));
    const [cmp] = await db.select({ v: count() }).from(companies).where(eq(companies.cabinetId, A));
    expect(cab.v).toBe(0);
    expect(usr.v).toBe(0);
    expect(cmp.v).toBe(0);
  });

  it("logPlatformAction écrit une ligne d'audit", async () => {
    // FK : platform_admin_id doit exister → on seed un admin
    const aid = `ops-auth-${randomUUID()}`;
    const [pa] = await db.insert(platformAdmins)
      .values({ authId: aid, email: `${aid}@t.local`, name: "Ops" })
      .returning({ id: platformAdmins.id });
    const action = `TEST_${A.slice(0, 8)}`;
    await logPlatformAction({ admin: { id: pa.id, email: "op@test.local" }, action, targetType: "cabinet", targetId: A, meta: { x: 1 } });
    const [row] = await db.select().from(platformAuditLogs).where(eq(platformAuditLogs.action, action)).limit(1);
    expect(row?.actorEmail).toBe("op@test.local");
    await db.delete(platformAuditLogs).where(eq(platformAuditLogs.action, action));
    await db.delete(platformAdmins).where(eq(platformAdmins.id, pa.id));
  });
});
