import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({
    id: "user-1",
    role: "ADMIN",
    email: "admin@test.com",
    name: "Admin",
  }),
}));

vi.mock("@/lib/access-log", () => ({
  logAccess: vi.fn(),
}));

describe("GET /api/auth/me", () => {
  it("returns current user role", async () => {
    const { GET } = await import("@/app/api/auth/me/route");
    const req = new Request("http://localhost/api/auth/me");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.role).toBe("ADMIN");
  });

  it("returns 401 when not authenticated", async () => {
    const { getCurrentUser } = await import("@/lib/auth");
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/auth/me/route");
    const req = new Request("http://localhost/api/auth/me");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("logs access on successful auth", async () => {
    const { logAccess } = await import("@/lib/access-log");
    const { GET } = await import("@/app/api/auth/me/route");
    const req = new Request("http://localhost/api/auth/me");
    await GET(req);
    expect(logAccess).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LOGIN", resourceType: "session" })
    );
  });
});
