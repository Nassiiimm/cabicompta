import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "client-1", role: "CLIENT", email: "c@t.com", name: "Client", authId: "a", phone: null, avatarUrl: null }),
}));

const mockDb: Record<string, any> = {};
["select", "from", "where", "limit", "leftJoin", "innerJoin"].forEach(
  (m) => (mockDb[m] = vi.fn().mockReturnValue(mockDb))
);

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  companyMembers: { userId: "user_id", companyId: "company_id" },
  companies: { id: "id", name: "name" },
}));

describe("GET /api/portal/company", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
  });

  it("returns company info for a client user", async () => {
    mockDb.limit.mockResolvedValueOnce([{ companyId: "comp-1", companyName: "Test Co" }]);

    const { GET } = await import("@/app/api/portal/company/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.companyId).toBe("comp-1");
  });

  it("returns 404 if user has no company", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/portal/company/route");
    const res = await GET();
    expect(res.status).toBe(404);
  });
});
