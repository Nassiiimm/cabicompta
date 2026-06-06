// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/cabicompta_dev";

const { buildIcs, getOrCreateCalendarToken, rotateCalendarToken } = await import("@/lib/calendar");
const { db } = await import("@/lib/db");
const { cabinets, users } = await import("@/lib/db/schema");
const { eq, inArray, sql } = await import("drizzle-orm");

describe("buildIcs", () => {
  it("génère un VCALENDAR avec un VEVENT par échéance", () => {
    const ics = buildIcs(
      [{ id: "d1", label: "T2 — annuel", dueDate: "2026-12-31", type: "T2", status: "UPCOMING", companyName: "Soc, Inc" }],
      "Cabinet X"
    );
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261231");
    expect(ics).toContain("UID:d1@cabicompta");
    expect(ics).toContain("T2 — annuel");
    expect(ics).toContain("Soc\\, Inc"); // virgule échappée
    expect(ics).toContain("END:VCALENDAR");
  });
});

let dbReady = false;
try { await db.execute(sql`select 1`); dbReady = true; } catch { /* skip */ }

const A = randomUUID();
const uid = randomUUID();

describe.skipIf(!dbReady)("jeton de calendrier", () => {
  beforeAll(async () => {
    await db.insert(cabinets).values({ id: A, slug: `cal-${A.slice(0, 8)}`, name: "C" });
    await db.insert(users).values({ id: uid, cabinetId: A, authId: null, email: `cal-${uid}@t.local`, name: "U", role: "STAFF" });
  });
  afterAll(async () => {
    await db.delete(users).where(eq(users.cabinetId, A));
    await db.delete(cabinets).where(inArray(cabinets.id, [A]));
  });

  it("getOrCreateCalendarToken est idempotent ; rotate change le jeton", async () => {
    const t1 = await getOrCreateCalendarToken(uid);
    const t2 = await getOrCreateCalendarToken(uid);
    expect(t1).toBe(t2);
    const t3 = await rotateCalendarToken(uid);
    expect(t3).not.toBe(t1);
  });
});
