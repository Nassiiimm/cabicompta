import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "admin-1", role: "ADMIN" }),
}));

vi.mock("@/lib/db", () => {
  const chain: Record<string, any> = {};
  ["select", "from", "where", "limit", "update", "set", "returning"].forEach(
    (m) => (chain[m] = vi.fn().mockReturnValue(chain))
  );
  chain.limit.mockResolvedValue([{ role: "STAFF" }]);
  chain.returning.mockResolvedValue([{ id: "comp-1", assignedTo: "staff-1" }]);
  return { db: chain };
});

vi.mock("@/lib/db/schema", () => ({
  companies: { id: "id", assignedTo: "assigned_to" },
  users: { id: "id", role: "role" },
}));

describe("PATCH /api/clients/[id]/assign", () => {
  it("allows unassigning with null", async () => {
    const { db } = await import("@/lib/db");
    (db as any).returning.mockResolvedValueOnce([{ id: "comp-1", assignedTo: null }]);

    const { PATCH } = await import("@/app/api/clients/[id]/assign/route");
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: null }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "comp-1" }) });
    expect(res.status).toBe(200);
  });

  it("requires ADMIN role", async () => {
    const { requireAdmin } = await import("@/lib/auth");
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Forbidden"));

    const { PATCH } = await import("@/app/api/clients/[id]/assign/route");
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: "staff-1" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "comp-1" }) });
    expect(res.status).toBe(403);
  });

  it("validates staffId is uuid or null", async () => {
    const { PATCH } = await import("@/app/api/clients/[id]/assign/route");
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: "not-a-uuid" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "comp-1" }) });
    // Zod will reject non-uuid
    expect(res.status).toBe(500); // generic catch
  });
});
