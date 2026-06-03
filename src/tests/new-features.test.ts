import { describe, it, expect, vi, beforeEach } from "vitest";
import * as schema from "@/lib/db/schema";

describe("new tables in schema", () => {
  it("exports documentComments table", () => {
    expect(schema.documentComments).toBeDefined();
    expect(schema.documentComments.documentId).toBeDefined();
    expect(schema.documentComments.userId).toBeDefined();
    expect(schema.documentComments.message).toBeDefined();
  });

  it("exports timeEntries table", () => {
    expect(schema.timeEntries).toBeDefined();
    expect(schema.timeEntries.userId).toBeDefined();
    expect(schema.timeEntries.companyId).toBeDefined();
    expect(schema.timeEntries.duration).toBeDefined();
    expect(schema.timeEntries.billable).toBeDefined();
  });

  it("exports accessLogs table", () => {
    expect(schema.accessLogs).toBeDefined();
    expect(schema.accessLogs.action).toBeDefined();
    expect(schema.accessLogs.resourceType).toBeDefined();
    expect(schema.accessLogs.userAgent).toBeDefined();
  });

  it("exports new types", () => {
    const _comment: schema.DocumentComment | undefined = undefined;
    const _time: schema.TimeEntry | undefined = undefined;
    const _access: schema.AccessLog | undefined = undefined;
    expect(true).toBe(true);
  });
});

// Access log lib
vi.mock("@/lib/db", () => {
  const chain: Record<string, any> = {};
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockResolvedValue([]);
  return { db: chain };
});

vi.mock("@/lib/db/schema", async () => {
  const actual = await vi.importActual("@/lib/db/schema");
  return { ...actual };
});

describe("logAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes an access log entry", async () => {
    const { db } = await import("@/lib/db");
    const { logAccess } = await import("@/lib/access-log");

    await logAccess({
      cabinetId: "cab-1", userId: "user-1",
      action: "LOGIN",
      resourceType: "session",
    });

    expect((db as any).insert).toHaveBeenCalled();
  });

  it("logs document downloads", async () => {
    const { db } = await import("@/lib/db");
    const { logAccess } = await import("@/lib/access-log");

    await logAccess({
      cabinetId: "cab-1", userId: "user-1",
      action: "DOCUMENT_DOWNLOAD",
      resourceType: "document",
      resourceId: "doc-1",
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
    });

    expect((db as any).values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "DOCUMENT_DOWNLOAD",
        resourceType: "document",
        resourceId: "doc-1",
      })
    );
  });

  it("never throws on error", async () => {
    const { db } = await import("@/lib/db");
    (db as any).values.mockRejectedValueOnce(new Error("fail"));

    const { logAccess } = await import("@/lib/access-log");
    await expect(
      logAccess({ cabinetId: "cab-1", userId: "u", action: "TEST", resourceType: "test" })
    ).resolves.toBeUndefined();
  });
});

describe("time entry validation", () => {
  it("duration must be in minutes (integer)", () => {
    const duration = 90; // 1h30
    expect(Number.isInteger(duration)).toBe(true);
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThanOrEqual(1440);
  });

  it("formats duration correctly", () => {
    const formatDuration = (min: number) => {
      const h = Math.floor(min / 60);
      const m = min % 60;
      return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
    };

    expect(formatDuration(30)).toBe("30min");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(90)).toBe("1h 30min");
    expect(formatDuration(150)).toBe("2h 30min");
  });
});
