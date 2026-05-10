import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireStaff: vi.fn().mockResolvedValue({ id: "staff-1", role: "STAFF", email: "s@t.com", name: "Staff" }),
}));

const mockDb: Record<string, any> = {};
["select", "from", "where", "orderBy", "limit", "innerJoin", "insert", "values", "returning"].forEach(
  (m) => (mockDb[m] = vi.fn().mockReturnValue(mockDb))
);

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  timeEntries: { id: "id", userId: "user_id", companyId: "company_id", date: "date" },
  companies: { id: "id", name: "name" },
  users: { id: "id" },
}));

describe("GET /api/time-entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
    mockDb.limit.mockResolvedValue([
      { id: "t1", duration: 60, description: "Tenue", date: "2026-05-10", billable: true, companyName: "Co", companyId: "c1" },
      { id: "t2", duration: 30, description: "Appel", date: "2026-05-10", billable: true, companyName: "Co", companyId: "c1" },
    ]);
  });

  it("returns entries with total minutes", async () => {
    const { GET } = await import("@/app/api/time-entries/route");
    const req = new Request("http://localhost/api/time-entries");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.entries).toHaveLength(2);
    expect(data.totalMinutes).toBe(90);
  });
});

describe("POST /api/time-entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
    mockDb.returning.mockResolvedValue([{ id: "t3", duration: 45 }]);
  });

  it("creates a time entry with valid UUID", async () => {
    const { POST } = await import("@/app/api/time-entries/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        duration: 45,
        description: "Révision",
        date: "2026-05-10",
        billable: true,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("rejects zero duration", async () => {
    const { POST } = await import("@/app/api/time-entries/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", duration: 0, description: "Test", date: "2026-05-10" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects duration over 24h", async () => {
    const { POST } = await import("@/app/api/time-entries/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", duration: 1500, description: "Test", date: "2026-05-10" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects empty description", async () => {
    const { POST } = await import("@/app/api/time-entries/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", duration: 30, description: "", date: "2026-05-10" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
