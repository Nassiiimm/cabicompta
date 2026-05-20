import { describe, it, expect, vi, beforeEach } from "vitest";

// Isolated test file for documents list route — category/subcategory filtering.
// Kept separate to avoid mock state contamination from other test suites.

const mockAdmin = { id: "admin-1", role: "ADMIN", email: "admin@test.com", name: "Admin", authId: "a", phone: null, avatarUrl: null };

vi.mock("@/lib/auth", () => ({
  requireStaff:  vi.fn().mockResolvedValue({ id: "admin-1", role: "ADMIN", email: "admin@test.com", name: "Admin", authId: "a", phone: null, avatarUrl: null }),
  requireAdmin:  vi.fn().mockResolvedValue({ id: "admin-1", role: "ADMIN", email: "admin@test.com", name: "Admin", authId: "a", phone: null, avatarUrl: null }),
  requireAuth:   vi.fn().mockResolvedValue({ id: "admin-1", role: "ADMIN", email: "admin@test.com", name: "Admin", authId: "a", phone: null, avatarUrl: null }),
}));

vi.mock("@/lib/audit",      () => ({ logAudit:  vi.fn() }));
vi.mock("@/lib/access-log", () => ({ logAccess: vi.fn() }));

const offsetFn = vi.fn().mockResolvedValue([]);
const limitChain = { offset: offsetFn };

const mockDb: Record<string, any> = {};
["select","from","leftJoin","orderBy","insert","values","returning","update","set","delete"].forEach(
  (m) => (mockDb[m] = vi.fn().mockReturnValue(mockDb))
);
// where always returns mockDb (count query destructures it — made iterable below)
mockDb.where = vi.fn().mockReturnValue(mockDb);
// limit returns {offset} so the docs query chain completes
mockDb.limit = vi.fn().mockReturnValue(limitChain);
// Make mockDb iterable so `const [totalResult] = await mockDb` doesn't throw
// totalResult will be undefined → totalResult?.total ?? 0 = 0 (safe)
(mockDb as any)[Symbol.iterator] = function* () { yield undefined; };

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/db/schema", () => ({
  companies:  { id: "id", name: "name", assignedTo: "assigned_to" },
  documents:  { id: "id", companyId: "company_id", fileName: "file_name", filePath: "file_path", fileSize: "file_size", mimeType: "mime_type", category: "category", subcategory: "subcategory", fiscalYear: "fiscal_year", extractedData: "extracted_data", status: "status", notes: "notes", deletedAt: "deleted_at", createdAt: "created_at", updatedAt: "updated_at", uploadedBy: "uploaded_by" },
  users:      { id: "id", name: "name" },
}));

describe("GET /api/documents — category & subcategory filter params", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.where.mockReturnValue(mockDb);
    mockDb.limit.mockReturnValue(limitChain);
    offsetFn.mockResolvedValue([]);
  });

  it("accepts valid category DAS", async () => {
    const { GET } = await import("@/app/api/documents/route");
    const req = new Request("http://localhost/api/documents?category=DAS");
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/documents?category=DAS") });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
  });

  it("accepts category TPS_TVQ with subcategory A", async () => {
    const { GET } = await import("@/app/api/documents/route");
    const req = new Request("http://localhost/api/documents?category=TPS_TVQ&subcategory=A");
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/documents?category=TPS_TVQ&subcategory=A") });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
  });

  it("accepts FINANCIAL_STATEMENT with subcategory B", async () => {
    const { GET } = await import("@/app/api/documents/route");
    const req = new Request("http://localhost/api/documents?category=FINANCIAL_STATEMENT&subcategory=B");
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/documents?category=FINANCIAL_STATEMENT&subcategory=B") });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
  });

  it("ignores invalid category — no 500", async () => {
    const { GET } = await import("@/app/api/documents/route");
    const req = new Request("http://localhost/api/documents?category=DROP_TABLE");
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/documents?category=DROP_TABLE") });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
  });

  it("ignores invalid subcategory Z — no 500", async () => {
    const { GET } = await import("@/app/api/documents/route");
    const req = new Request("http://localhost/api/documents?subcategory=Z");
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/documents?subcategory=Z") });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
  });

  it("returns paginated response shape", async () => {
    const { GET } = await import("@/app/api/documents/route");
    const req = new Request("http://localhost/api/documents");
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/documents") });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("documents");
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("page");
  });
});
