import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireStaff: vi.fn().mockResolvedValue({ id: "staff-1", role: "ADMIN", email: "admin@test.com", name: "Admin" }),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

const mockDb: Record<string, any> = {};
["select", "from", "where", "orderBy", "limit", "insert", "values", "returning", "update", "set", "delete"].forEach(
  (m) => (mockDb[m] = vi.fn().mockReturnValue(mockDb))
);

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  kycDocuments: {
    id: "id",
    companyId: "company_id",
    adminName: "admin_name",
    adminRole: "admin_role",
    documentType: "document_type",
    notes: "notes",
    verified: "verified",
    verifiedBy: "verified_by",
    verifiedAt: "verified_at",
  },
  companies: {
    id: "id",
    name: "name",
    kycVerified: "kyc_verified",
    kycVerifiedAt: "kyc_verified_at",
    conflictCheck: "conflict_check",
    conflictCheckNotes: "conflict_check_notes",
    updatedAt: "updated_at",
  },
}));

describe("GET /api/kyc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
  });

  it("returns KYC docs for a company", async () => {
    const docs = [
      { id: "kyc-1", companyId: "comp-1", adminName: "John", documentType: "ID", verified: false },
      { id: "kyc-2", companyId: "comp-1", adminName: "Jane", documentType: "PROOF", verified: true },
    ];
    mockDb.where.mockResolvedValueOnce(docs);

    const { GET } = await import("@/app/api/kyc/route");
    const req = new Request("http://localhost/api/kyc?companyId=comp-1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
  });

  it("returns 400 when companyId is missing", async () => {
    const { GET } = await import("@/app/api/kyc/route");
    const req = new Request("http://localhost/api/kyc");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 for unauthorized users", async () => {
    const { requireStaff } = await import("@/lib/auth");
    vi.mocked(requireStaff).mockRejectedValueOnce(new Error("Unauthorized"));

    const { GET } = await import("@/app/api/kyc/route");
    const req = new Request("http://localhost/api/kyc?companyId=comp-1");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/kyc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
    mockDb.returning.mockResolvedValue([{
      id: "kyc-new",
      companyId: "comp-1",
      adminName: "John Doe",
      adminRole: "Director",
      documentType: "ID_CARD",
    }]);
  });

  it("creates a KYC document entry", async () => {
    const { POST } = await import("@/app/api/kyc/route");
    const req = new Request("http://localhost/api/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: "550e8400-e29b-41d4-a716-446655440000",
        adminName: "John Doe",
        adminRole: "Director",
        documentType: "ID_CARD",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe("kyc-new");
  });

  it("rejects missing adminName", async () => {
    const { POST } = await import("@/app/api/kyc/route");
    const req = new Request("http://localhost/api/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: "550e8400-e29b-41d4-a716-446655440000",
        adminRole: "Director",
        documentType: "ID_CARD",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 for unauthorized users", async () => {
    const { requireStaff } = await import("@/lib/auth");
    vi.mocked(requireStaff).mockRejectedValueOnce(new Error("Unauthorized"));

    const { POST } = await import("@/app/api/kyc/route");
    const req = new Request("http://localhost/api/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: "550e8400-e29b-41d4-a716-446655440000",
        adminName: "John",
        adminRole: "Director",
        documentType: "ID_CARD",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/kyc/[id] — verify document", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
  });

  it("marks document as verified", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "kyc-1", verified: false }]);
    mockDb.returning.mockResolvedValueOnce([{ id: "kyc-1", verified: true, verifiedBy: "staff-1" }]);

    const { PATCH } = await import("@/app/api/kyc/[id]/route");
    const req = new Request("http://localhost", { method: "PATCH" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "kyc-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.verified).toBe(true);
  });

  it("returns 404 for non-existent document", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const { PATCH } = await import("@/app/api/kyc/[id]/route");
    const req = new Request("http://localhost", { method: "PATCH" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/clients/[id]/kyc-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
  });

  it("updates kycVerified and conflictCheck", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "comp-1", kycVerified: false, conflictCheck: false }]);
    mockDb.returning.mockResolvedValueOnce([{ id: "comp-1", kycVerified: true, conflictCheck: true }]);

    const { PATCH } = await import("@/app/api/clients/[id]/kyc-status/route");
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kycVerified: true, conflictCheck: true }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "comp-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.kycVerified).toBe(true);
  });

  it("returns 404 for non-existent company", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const { PATCH } = await import("@/app/api/clients/[id]/kyc-status/route");
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kycVerified: true }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("logs audit trail for KYC status change", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "comp-1", kycVerified: false, conflictCheck: false }]);
    mockDb.returning.mockResolvedValueOnce([{ id: "comp-1", kycVerified: true }]);

    const { logAudit } = await import("@/lib/audit");
    const { PATCH } = await import("@/app/api/clients/[id]/kyc-status/route");
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kycVerified: true }),
    });
    await PATCH(req, { params: Promise.resolve({ id: "comp-1" }) });

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE_KYC_STATUS",
        tableName: "companies",
        recordId: "comp-1",
      })
    );
  });

  it("returns 401 for unauthorized users", async () => {
    const { requireStaff } = await import("@/lib/auth");
    vi.mocked(requireStaff).mockRejectedValueOnce(new Error("Unauthorized"));

    const { PATCH } = await import("@/app/api/clients/[id]/kyc-status/route");
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kycVerified: true }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "comp-1" }) });
    expect(res.status).toBe(401);
  });
});
