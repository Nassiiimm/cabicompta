import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "admin-1", role: "ADMIN", email: "admin@test.com", name: "Admin" }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: "auth-new-1" } },
          error: null,
        }),
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  }),
}));

const mockDb: Record<string, any> = {};
["select", "from", "where", "orderBy", "limit", "insert", "values", "returning", "update", "set", "delete"].forEach(
  (m) => (mockDb[m] = vi.fn().mockReturnValue(mockDb))
);

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  users: {
    id: "id",
    authId: "auth_id",
    name: "name",
    email: "email",
    role: "role",
    createdAt: "created_at",
  },
}));

describe("GET /api/admin/staff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
  });

  it("lists staff users", async () => {
    mockDb.orderBy.mockResolvedValueOnce([
      { id: "u1", name: "Admin One", email: "a@t.com", role: "ADMIN", createdAt: "2026-01-01" },
      { id: "u2", name: "Staff Two", email: "s@t.com", role: "STAFF", createdAt: "2026-01-02" },
    ]);

    const { GET } = await import("@/app/api/admin/staff/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
    expect(data[0].role).toBe("ADMIN");
  });

  it("returns 401 for unauthorized users", async () => {
    const { requireAdmin } = await import("@/lib/auth");
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Unauthorized"));

    const { GET } = await import("@/app/api/admin/staff/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-ADMIN (Forbidden)", async () => {
    const { requireAdmin } = await import("@/lib/auth");
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Forbidden"));

    const { GET } = await import("@/app/api/admin/staff/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/staff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
    // No existing user by default
    mockDb.limit.mockResolvedValue([]);
    mockDb.returning.mockResolvedValue([{
      id: "new-user",
      email: "new@test.com",
      name: "New Staff",
      role: "STAFF",
    }]);
  });

  it("creates a staff user", async () => {
    const { POST } = await import("@/app/api/admin/staff/route");
    const req = new Request("http://localhost/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New Staff",
        email: "new@test.com",
        password: "securepass123",
        role: "STAFF",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.email).toBe("new@test.com");
    expect(data.tempPassword).toBe("securepass123");
  });

  it("rejects non-ADMIN users (401)", async () => {
    const { requireAdmin } = await import("@/lib/auth");
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Unauthorized"));

    const { POST } = await import("@/app/api/admin/staff/route");
    const req = new Request("http://localhost/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Hacker",
        email: "hack@test.com",
        password: "hackpass123",
        role: "ADMIN",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects invalid data (missing fields)", async () => {
    const { POST } = await import("@/app/api/admin/staff/route");
    const req = new Request("http://localhost/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No Email" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects short password", async () => {
    const { POST } = await import("@/app/api/admin/staff/route");
    const req = new Request("http://localhost/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Short Pass",
        email: "short@test.com",
        password: "abc",
        role: "STAFF",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects duplicate email (409)", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "existing-1" }]);

    const { POST } = await import("@/app/api/admin/staff/route");
    const req = new Request("http://localhost/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dup User",
        email: "existing@test.com",
        password: "securepass123",
        role: "STAFF",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/admin/staff/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
  });

  it("bans a staff user", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "staff-2", authId: "auth-2", name: "Staff Two" }]);

    const { DELETE } = await import("@/app/api/admin/staff/[id]/route");
    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "staff-2" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("prevents self-deletion", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "admin-1", authId: "auth-admin", name: "Admin" }]);

    const { DELETE } = await import("@/app/api/admin/staff/[id]/route");
    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "admin-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent user", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const { DELETE } = await import("@/app/api/admin/staff/[id]/route");
    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns 401 for unauthorized users", async () => {
    const { requireAdmin } = await import("@/lib/auth");
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Unauthorized"));

    const { DELETE } = await import("@/app/api/admin/staff/[id]/route");
    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "staff-2" }) });
    expect(res.status).toBe(401);
  });
});
