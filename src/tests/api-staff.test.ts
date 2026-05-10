import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireStaff: vi.fn().mockResolvedValue({ id: "staff-1", role: "ADMIN" }),
}));

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockResolvedValue([
    { id: "1", name: "Admin", email: "admin@test.com", role: "ADMIN" },
    { id: "2", name: "Julie", email: "julie@test.com", role: "STAFF" },
  ]),
};

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  users: { id: "id", name: "name", email: "email", role: "role" },
}));

describe("GET /api/staff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
  });

  it("returns list of staff and admin users", async () => {
    const { GET } = await import("@/app/api/staff/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
    expect(data[0].role).toBe("ADMIN");
    expect(data[1].role).toBe("STAFF");
  });

  it("returns 401 for unauthorized users", async () => {
    const { requireStaff } = await import("@/lib/auth");
    vi.mocked(requireStaff).mockRejectedValueOnce(new Error("Unauthorized"));

    const { GET } = await import("@/app/api/staff/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
