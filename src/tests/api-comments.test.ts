import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "user-1", role: "ADMIN", email: "a@t.com", name: "Admin", authId: "a", phone: null, avatarUrl: null, presenceNoticeAckedAt: null }),
}));

const mockDb: Record<string, any> = {};
["select", "from", "where", "orderBy", "limit", "innerJoin", "insert", "values", "returning"].forEach(
  (m) => (mockDb[m] = vi.fn().mockReturnValue(mockDb))
);

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  documentComments: { id: "id", documentId: "document_id", userId: "user_id", message: "message", createdAt: "created_at" },
  users: { id: "id", name: "name", role: "role" },
  documents: { id: "id", companyId: "company_id" },
  companyMembers: { userId: "user_id", companyId: "company_id" },
}));

describe("POST /api/documents/[id]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
    // verifyDocumentAccess: doc exists + ADMIN = no membership check
    mockDb.limit.mockResolvedValue([{ id: "doc-1", companyId: "comp-1" }]);
    mockDb.returning.mockResolvedValue([{ id: "c2", documentId: "doc-1", message: "New comment" }]);
  });

  it("creates a comment on a document", async () => {
    const { POST } = await import("@/app/api/documents/[id]/comments/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "New comment" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "doc-1" }) });
    expect(res.status).toBe(201);
  });

  it("rejects empty message", async () => {
    const { POST } = await import("@/app/api/documents/[id]/comments/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "doc-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 403 when doc not found (access denied)", async () => {
    mockDb.limit.mockResolvedValueOnce([]); // doc not found = access denied
    const { POST } = await import("@/app/api/documents/[id]/comments/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Test" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(403);
  });

  it("blocks CLIENT from commenting on other company docs", async () => {
    const { requireAuth } = await import("@/lib/auth");
    vi.mocked(requireAuth).mockResolvedValueOnce({
      id: "client-1", role: "CLIENT", email: "c@t.com", name: "C", authId: "a", phone: null, avatarUrl: null, presenceNoticeAckedAt: null,
    });
    // Doc exists but no membership
    mockDb.limit
      .mockResolvedValueOnce([{ id: "doc-1", companyId: "comp-1" }])
      .mockResolvedValueOnce([]); // no membership

    const { POST } = await import("@/app/api/documents/[id]/comments/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Test" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "doc-1" }) });
    expect(res.status).toBe(403);
  });
});
