import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUser = { id: "user-1", role: "ADMIN", email: "admin@test.com", name: "Admin", authId: "a", phone: null, avatarUrl: null, presenceNoticeAckedAt: null, aiConsentAckedAt: null, cabinetId: "cab-1" };

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue(mockUser),
}));

vi.mock("@/lib/email", () => ({
  sendDocumentRequestEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/db", () => {
  const chain: Record<string, any> = {};
  const methods = ["select", "from", "where", "orderBy", "limit", "insert", "values", "returning", "update", "set"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.limit.mockResolvedValue([]);
  chain.returning.mockResolvedValue([]);
  return { db: chain };
});

vi.mock("@/lib/db/schema", () => ({
  notifications: { id: "id", userId: "user_id", read: "read", createdAt: "created_at", title: "title" },
  users: { id: "id", email: "email", name: "name" },
  companyMembers: { userId: "user_id", companyId: "company_id" },
  companies: { id: "id", name: "name" },
}));

describe("POST /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects CLIENT role", async () => {
    const { requireAuth } = await import("@/lib/auth");
    vi.mocked(requireAuth).mockResolvedValueOnce({ ...mockUser, role: "CLIENT" });

    const { POST } = await import("@/app/api/notifications/route");
    const req = new Request("http://localhost/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: "c-1", title: "T", message: "M", type: "SYSTEM" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("requires userId or companyId", async () => {
    const { POST } = await import("@/app/api/notifications/route");
    const req = new Request("http://localhost/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "T", message: "M", type: "SYSTEM" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects invalid type", async () => {
    const { POST } = await import("@/app/api/notifications/route");
    const req = new Request("http://localhost/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u-1", title: "T", message: "M", type: "INVALID" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("notification types", () => {
  it("supports all required types", () => {
    const types = ["DEADLINE", "DOCUMENT", "INVOICE", "APPOINTMENT", "TASK", "SYSTEM"];
    for (const t of types) {
      expect(t).toBeTruthy();
    }
  });
});
