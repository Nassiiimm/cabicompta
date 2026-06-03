// @vitest-environment node
//
// Test d'INTÉGRATION du provisioning d'un cabinet (vraie base locale).
// Skippé si la base locale n'est pas joignable. Voir isolation.test.ts.

import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/cabicompta_dev";

const { db } = await import("@/lib/db");
const schema = await import("@/lib/db/schema");
const { provisionCabinet } = await import("@/lib/provisioning");
const { eq, inArray } = await import("drizzle-orm");
const { sql } = await import("drizzle-orm");

const { cabinets, users, workflowTemplates, workflowTemplateTasks } = schema;

let dbReady = false;
try {
  await db.execute(sql`select 1`);
  dbReady = true;
} catch {
  console.warn("[provisioning] Base locale injoignable — test SKIPPÉ.");
}

const slug = `prov-${randomUUID().slice(0, 8)}`;
let cabinetId = "";

describe.skipIf(!dbReady)("provisionCabinet", () => {
  afterAll(async () => {
    if (!cabinetId) return;
    await db.delete(workflowTemplateTasks).where(eq(workflowTemplateTasks.cabinetId, cabinetId));
    await db.delete(workflowTemplates).where(eq(workflowTemplates.cabinetId, cabinetId));
    await db.delete(users).where(eq(users.cabinetId, cabinetId));
    await db.delete(cabinets).where(eq(cabinets.id, cabinetId));
  });

  it("crée un cabinet, un admin et les templates par défaut — tout stampé du bon cabinet_id", async () => {
    const res = await provisionCabinet({
      name: "Cabinet Test",
      slug,
      admin: { authId: `auth-${randomUUID()}`, email: `${slug}@test.local`, name: "Admin Test" },
    });
    cabinetId = res.cabinetId;

    // Cabinet
    const [cab] = await db.select().from(cabinets).where(eq(cabinets.id, res.cabinetId));
    expect(cab.slug).toBe(slug);
    expect(cab.status).toBe("ACTIVE");

    // Admin : rôle ADMIN, rattaché au cabinet
    const [admin] = await db.select().from(users).where(eq(users.id, res.adminUserId));
    expect(admin.role).toBe("ADMIN");
    expect(admin.cabinetId).toBe(res.cabinetId);

    // Templates par défaut (3), tous stampés du cabinet
    const tpls = await db.select().from(workflowTemplates).where(eq(workflowTemplates.cabinetId, res.cabinetId));
    expect(tpls.length).toBe(3);
    expect(tpls.every((t) => t.cabinetId === res.cabinetId)).toBe(true);

    // Tâches des templates, stampées du cabinet
    const taskRows = await db
      .select({ cabinetId: workflowTemplateTasks.cabinetId })
      .from(workflowTemplateTasks)
      .where(inArray(workflowTemplateTasks.templateId, tpls.map((t) => t.id)));
    expect(taskRows.length).toBeGreaterThan(0);
    expect(taskRows.every((r) => r.cabinetId === res.cabinetId)).toBe(true);
  });
});
