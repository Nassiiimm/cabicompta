import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => {
  const chain: Record<string, any> = {};
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockResolvedValue([]);
  return { db: chain };
});

vi.mock("@/lib/db/schema", () => ({
  auditLogs: { id: "id" },
}));

describe("logAudit", () => {
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/db");
    mockDb = mod.db;
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockResolvedValue([]);
  });

  it("writes an audit log entry", async () => {
    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      userId: "user-1",
      action: "UPDATE",
      tableName: "companies",
      recordId: "comp-1",
      oldData: { name: "Old" },
      newData: { name: "New" },
    });
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("handles null userId", async () => {
    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      userId: null,
      action: "SYSTEM",
      tableName: "fiscal_deadlines",
    });
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null })
    );
  });

  it("never throws even if DB fails", async () => {
    mockDb.values.mockRejectedValueOnce(new Error("DB error"));
    const { logAudit } = await import("@/lib/audit");
    await expect(
      logAudit({ userId: "u", action: "TEST", tableName: "test" })
    ).resolves.toBeUndefined();
  });

  it("stores old and new data", async () => {
    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      userId: "u",
      action: "STATUS_CHANGE",
      tableName: "invoices",
      recordId: "inv-1",
      oldData: { status: "DRAFT" },
      newData: { status: "SENT" },
    });
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        oldData: { status: "DRAFT" },
        newData: { status: "SENT" },
      })
    );
  });
});
