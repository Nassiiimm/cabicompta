// @vitest-environment node
//
// Résolution super-admin plateforme (getPlatformAdmin) — intégration vraie base.
// Skippé si base locale absente. Pré-requis : migration 0008 (platform_admins).

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/cabicompta_dev";

// getSession mockée → on contrôle l'auth_id de la session
const h = vi.hoisted(() => ({ session: null as null | { id: string } }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn(async () => h.session) }));

const { db } = await import("@/lib/db");
const { platformAdmins } = await import("@/lib/db/schema");
const { getPlatformAdmin } = await import("@/lib/platform");
const { eq, sql } = await import("drizzle-orm");

let dbReady = false;
try {
  const r = await db.execute(sql`select to_regclass('public.platform_admins') as t`);
  dbReady = !!(r as unknown as { t: string | null }[])[0]?.t;
  if (!dbReady) console.warn("[platform] table platform_admins absente (0008) — SKIPPÉ.");
} catch {
  console.warn("[platform] base locale injoignable — SKIPPÉ.");
}

const authId = `pa-auth-${randomUUID()}`;

describe.skipIf(!dbReady)("getPlatformAdmin", () => {
  beforeAll(async () => {
    await db.insert(platformAdmins).values({ authId, email: `${authId}@test.local`, name: "Super Admin" });
  });
  afterAll(async () => {
    await db.delete(platformAdmins).where(eq(platformAdmins.authId, authId));
  });

  it("renvoie le super-admin si la session correspond", async () => {
    h.session = { id: authId };
    const pa = await getPlatformAdmin();
    expect(pa?.authId).toBe(authId);
  });

  it("renvoie null pour une session non super-admin", async () => {
    h.session = { id: "un-utilisateur-cabinet-quelconque" };
    expect(await getPlatformAdmin()).toBeNull();
  });

  it("renvoie null sans session", async () => {
    h.session = null;
    expect(await getPlatformAdmin()).toBeNull();
  });
});
