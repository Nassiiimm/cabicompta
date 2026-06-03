import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/authz", () => ({
  hasCompanyAccess: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/auth", () => ({
  requireStaff: vi.fn().mockResolvedValue({ id: "staff-1", cabinetId: "cab-1", role: "ADMIN" }),
}));

vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: "auth-new-1" } },
          error: null,
        }),
      },
    },
  }),
}));

vi.mock("@/lib/db", () => {
  const chain: Record<string, any> = {};
  ["select", "from", "where", "limit", "insert", "values", "returning"].forEach(
    (m) => (chain[m] = vi.fn().mockReturnValue(chain))
  );
  return { db: chain };
});

vi.mock("@/lib/db/schema", () => ({
  users: { id: "id", email: "email" },
  companies: { id: "id", name: "name" },
  companyMembers: { userId: "user_id", companyId: "company_id" },
}));

describe("POST /api/clients/[id]/invite", () => {
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/db");
    mockDb = mod.db;
    Object.keys(mockDb).forEach((k: string) => (mockDb[k] as any).mockReturnValue(mockDb));
  });

  it("creates a new client account", async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: "comp-1", name: "Test Co" }])
      .mockResolvedValueOnce([]);
    mockDb.returning
      .mockResolvedValueOnce([{ id: "user-new", email: "n@t.com", name: "N" }])
      .mockResolvedValueOnce([]);

    const { POST } = await import("@/app/api/clients/[id]/invite/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@test.com", name: "New User" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "comp-1" }) });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.created).toBe(true);
    expect(data.tempPassword).toBeTruthy();
  });

  it("rejects invalid email", async () => {
    const { POST } = await import("@/app/api/clients/[id]/invite/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bad", name: "Test" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "comp-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent company", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const { POST } = await import("@/app/api/clients/[id]/invite/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "t@t.com", name: "Test" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("rejects missing name", async () => {
    const { POST } = await import("@/app/api/clients/[id]/invite/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "t@t.com", name: "" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "comp-1" }) });
    expect(res.status).toBe(400);
  });
});
