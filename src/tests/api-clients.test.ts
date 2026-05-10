import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  requireStaff: vi.fn().mockResolvedValue({ id: "staff-1", role: "ADMIN", email: "admin@test.com", name: "Admin" }),
  requireAdmin: vi.fn().mockResolvedValue({ id: "staff-1", role: "ADMIN", email: "admin@test.com", name: "Admin" }),
  requireAuth: vi.fn().mockResolvedValue({ id: "staff-1", role: "ADMIN", email: "admin@test.com", name: "Admin" }),
}));

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "new-id", name: "Test Company" }]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  companies: { id: "id", name: "name", neq: "neq", email: "email", status: "status", assignedTo: "assigned_to" },
  users: { id: "id", role: "role" },
  companyMembers: { userId: "user_id", companyId: "company_id" },
}));

describe("GET /api/clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockResolvedValue([
      { id: "1", name: "Company A", status: "ACTIVE" },
      { id: "2", name: "Company B", status: "ACTIVE" },
    ]);
  });

  it("returns list of companies", async () => {
    const { GET } = await import("@/app/api/clients/route");
    const req = new Request("http://localhost/api/clients");
    Object.defineProperty(req, "nextUrl", {
      value: new URL("http://localhost/api/clients"),
    });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
  });

  it("supports search parameter", async () => {
    const { GET } = await import("@/app/api/clients/route");
    const req = new Request("http://localhost/api/clients?search=test");
    Object.defineProperty(req, "nextUrl", {
      value: new URL("http://localhost/api/clients?search=test"),
    });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([{ id: "new-id", name: "New Company" }]);
  });

  it("creates a company with valid data", async () => {
    const { POST } = await import("@/app/api/clients/route");
    const req = new Request("http://localhost/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Company" }),
    });
    Object.defineProperty(req, "nextUrl", {
      value: new URL("http://localhost/api/clients"),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
  });

  it("rejects missing name", async () => {
    const { POST } = await import("@/app/api/clients/route");
    const req = new Request("http://localhost/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    Object.defineProperty(req, "nextUrl", {
      value: new URL("http://localhost/api/clients"),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("rejects invalid email", async () => {
    const { POST } = await import("@/app/api/clients/route");
    const req = new Request("http://localhost/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", email: "not-an-email" }),
    });
    Object.defineProperty(req, "nextUrl", {
      value: new URL("http://localhost/api/clients"),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});

describe("auth protection", () => {
  it("returns 401 for unauthorized users", async () => {
    const { requireStaff } = await import("@/lib/auth");
    vi.mocked(requireStaff).mockRejectedValueOnce(new Error("Unauthorized"));

    const { GET } = await import("@/app/api/clients/route");
    const req = new Request("http://localhost/api/clients");
    Object.defineProperty(req, "nextUrl", {
      value: new URL("http://localhost/api/clients"),
    });
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });
});
