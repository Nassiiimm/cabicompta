import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted — define users inline in factory
vi.mock("@/lib/auth", () => ({
  requireStaff: vi.fn().mockResolvedValue({ id: "intern-1", role: "INTERN", email: "intern@test.com", name: "Intern" }),
  requireAdmin: vi.fn().mockResolvedValue({ id: "admin-1",  role: "ADMIN",  email: "admin@test.com",  name: "Admin"  }),
  requireAuth:  vi.fn().mockResolvedValue({ id: "intern-1", role: "INTERN", email: "intern@test.com", name: "Intern" }),
}));

vi.mock("@/lib/audit",      () => ({ logAudit:  vi.fn() }));
vi.mock("@/lib/access-log", () => ({ logAccess: vi.fn() }));

const mockDb: Record<string, any> = {};
["select","from","where","orderBy","limit","offset","insert","values","returning","update","set","delete","leftJoin"].forEach(
  (m) => (mockDb[m] = vi.fn().mockReturnValue(mockDb))
);

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/db/schema", () => ({
  companies:       { id: "id", name: "name", status: "status", assignedTo: "assigned_to", deletedAt: "deleted_at" },
  documents:       { id: "id", companyId: "company_id", fileName: "file_name", category: "category", subcategory: "subcategory", status: "status", deletedAt: "deleted_at" },
  invoices:        { id: "id", companyId: "company_id", deletedAt: "deleted_at" },
  fiscalDeadlines: { id: "id", companyId: "company_id" },
  workflows:       { id: "id", companyId: "company_id" },
  users:           { id: "id", role: "role" },
}));

const mockAdmin  = { id: "admin-1",  role: "ADMIN" as const,  email: "admin@test.com",  name: "Admin",  authId: "a", phone: null, avatarUrl: null, presenceNoticeAckedAt: null, aiConsentAckedAt: null, cabinetId: "cab-1" };
const mockIntern = { id: "intern-1", role: "INTERN" as const, email: "intern@test.com", name: "Intern", authId: "b", phone: null, avatarUrl: null, presenceNoticeAckedAt: null, aiConsentAckedAt: null, cabinetId: "cab-1" };

// ── /api/clients — INTERN voit seulement ses clients assignés ──────────────

describe("GET /api/clients — INTERN filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
  });

  it("returns 200 with filtered list for INTERN", async () => {
    mockDb.orderBy.mockResolvedValueOnce([
      { id: "comp-1", name: "Mon Client", status: "ACTIVE" },
    ]);

    const { GET } = await import("@/app/api/clients/route");
    const req = new Request("http://localhost/api/clients");
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/clients") });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

// ── /api/clients/[id] — INTERN ne peut pas accéder à un client non-assigné ─

describe("GET /api/clients/[id] — INTERN ownership check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
  });

  it("returns 403 when INTERN accesses unassigned client", async () => {
    mockDb.limit.mockResolvedValueOnce([{
      id: "comp-2", name: "Autre Client", status: "ACTIVE",
      assignedTo: "other-staff", deletedAt: null,
    }]);

    const { GET } = await import("@/app/api/clients/[id]/route");
    const req = new Request("http://localhost/api/clients/comp-2");
    const res = await GET(req, { params: Promise.resolve({ id: "comp-2" }) });
    expect(res.status).toBe(403);
  });

  it("returns 200 and strips banking fields for INTERN on own client", async () => {
    mockDb.limit.mockResolvedValueOnce([{
      id: "comp-1", name: "Mon Client", status: "ACTIVE",
      assignedTo: "intern-1", deletedAt: null,
      type: null, neq: null, arcNumber: null, rqNumber: null,
      fiscalYearEnd: null, address: null, city: null, province: "QC",
      postalCode: null, phone: null, email: null, notes: null,
      kycVerified: false, kycVerifiedAt: null,
      conflictCheck: false, conflictCheckNotes: null,
      inboxEmail: null, inboxActive: false,
      bankName: "BNC", bankTransitNumber: "12345",
      bankInstitutionNumber: "006", bankAccountNumber: "9876543",
      bankOnlineId: "user123", bankPassword: "secret",
      createdAt: new Date(), updatedAt: new Date(),
    }]);

    const { GET } = await import("@/app/api/clients/[id]/route");
    const req = new Request("http://localhost/api/clients/comp-1");
    const res = await GET(req, { params: Promise.resolve({ id: "comp-1" }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.bankName).toBeUndefined();
    expect(data.bankPassword).toBeUndefined();
    expect(data.bankAccountNumber).toBeUndefined();
    expect(data.bankOnlineId).toBeUndefined();
  });

  it("blocks DELETE for INTERN", async () => {
    mockDb.limit.mockResolvedValueOnce([{
      id: "comp-1", name: "Mon Client",
      assignedTo: "intern-1", deletedAt: null,
    }]);

    const { DELETE } = await import("@/app/api/clients/[id]/route");
    const req = new Request("http://localhost/api/clients/comp-1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "comp-1" }) });
    expect(res.status).toBe(403);
  });
});

// ── Document category/subcategory filtering ─────────────────────────────────
// Tested in api-documents-filters.test.ts (separate file avoids mock state issues)

// ── Client type filtering ───────────────────────────────────────────────────

describe("GET /api/clients — type filter", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
    const { requireStaff } = await import("@/lib/auth");
    vi.mocked(requireStaff).mockResolvedValue(mockAdmin);
  });

  it("accepts valid type T2_SOCIETE", async () => {
    mockDb.orderBy.mockResolvedValueOnce([{ id: "c1", name: "Société ABC", status: "ACTIVE" }]);

    const { GET } = await import("@/app/api/clients/route");
    const req = new Request("http://localhost/api/clients?type=T2_SOCIETE");
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/clients?type=T2_SOCIETE") });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });

  it("accepts valid type T1_PARTICULIER", async () => {
    mockDb.orderBy.mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/clients/route");
    const req = new Request("http://localhost/api/clients?type=T1_PARTICULIER");
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/clients?type=T1_PARTICULIER") });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
  });

  it("ignores invalid type (no 500)", async () => {
    mockDb.orderBy.mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/clients/route");
    const req = new Request("http://localhost/api/clients?type=HACKER");
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/clients?type=HACKER") });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
  });
});
