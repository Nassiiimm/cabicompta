import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "user-1", role: "ADMIN", email: "a@t.com", name: "Admin", authId: "a", phone: null, avatarUrl: null }),
  requireStaff: vi.fn().mockResolvedValue({ id: "user-1", role: "ADMIN", email: "a@t.com", name: "Admin", authId: "a", phone: null, avatarUrl: null }),
}));

vi.mock("@/lib/supabase/storage", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://signed-url.com/doc.pdf"),
  deleteFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/access-log", () => ({
  logAccess: vi.fn(),
}));

const mockDoc = {
  id: "doc-1",
  companyId: "comp-1",
  uploadedBy: "user-1",
  fileName: "facture.pdf",
  filePath: "comp-1/2026/facture.pdf",
  fileSize: 1024,
  mimeType: "application/pdf",
  category: "INVOICE",
  fiscalYear: 2026,
  status: "PENDING",
  notes: null,
  extractedData: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDb: Record<string, any> = {};
["select", "from", "where", "orderBy", "limit", "leftJoin", "innerJoin", "insert", "values", "returning", "update", "set", "delete"].forEach(
  (m) => (mockDb[m] = vi.fn().mockReturnValue(mockDb))
);
mockDb.limit.mockResolvedValue([mockDoc]);
mockDb.returning.mockResolvedValue([mockDoc]);

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  documents: { id: "id", companyId: "company_id", uploadedBy: "uploaded_by", status: "status", filePath: "file_path" },
  companies: { id: "id", name: "name" },
  users: { id: "id", name: "name" },
  companyMembers: { companyId: "company_id", userId: "user_id" },
}));

describe("GET /api/documents/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.limit.mockResolvedValue([mockDoc]);
  });

  it("returns document with signed download URL", async () => {
    const { GET } = await import("@/app/api/documents/[id]/route");
    const req = new Request("http://localhost");
    const res = await GET(req as any, { params: Promise.resolve({ id: "doc-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.downloadUrl).toBe("https://signed-url.com/doc.pdf");
    expect(data.document.id).toBe("doc-1");
  });

  it("returns 404 for missing document", async () => {
    mockDb.limit.mockResolvedValueOnce([]);
    const { GET } = await import("@/app/api/documents/[id]/route");
    const req = new Request("http://localhost");
    const res = await GET(req as any, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("logs access on document download (Loi 25)", async () => {
    const { logAccess } = await import("@/lib/access-log");
    const { GET } = await import("@/app/api/documents/[id]/route");
    const req = new Request("http://localhost");
    await GET(req as any, { params: Promise.resolve({ id: "doc-1" }) });
    expect(logAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "DOCUMENT_DOWNLOAD",
        resourceType: "document",
        resourceId: "doc-1",
      })
    );
  });

  it("blocks CLIENT from accessing other company documents", async () => {
    const { requireAuth } = await import("@/lib/auth");
    vi.mocked(requireAuth).mockResolvedValueOnce({
      id: "client-1", role: "CLIENT", email: "c@t.com", name: "C", authId: "a", phone: null, avatarUrl: null,
    });
    // No membership found
    mockDb.limit.mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/documents/[id]/route");
    const req = new Request("http://localhost");
    const res = await GET(req as any, { params: Promise.resolve({ id: "doc-1" }) });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/documents/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.limit.mockResolvedValue([mockDoc]);
    mockDb.returning.mockResolvedValue([{ ...mockDoc, status: "PROCESSED" }]);
  });

  it("updates document category", async () => {
    const { PATCH } = await import("@/app/api/documents/[id]/route");
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "BANK_STATEMENT" }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: "doc-1" }) });
    expect(res.status).toBe(200);
  });

  it("updates document status to PROCESSED", async () => {
    const { PATCH } = await import("@/app/api/documents/[id]/route");
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PROCESSED" }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: "doc-1" }) });
    expect(res.status).toBe(200);
  });

  it("ignores invalid category", async () => {
    const { PATCH } = await import("@/app/api/documents/[id]/route");
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "INVALID" }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: "doc-1" }) });
    expect(res.status).toBe(200); // ignored, not rejected
  });
});
