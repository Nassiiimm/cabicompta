import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireStaff: vi.fn().mockResolvedValue({ id: "staff-1", role: "ADMIN", email: "a@t.com", name: "Admin" }),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

const mockCompany = {
  id: "comp-1",
  name: "Test Company",
  status: "ACTIVE",
  deletedAt: null,
  assignedTo: null,
};

const mockDb: Record<string, any> = {};
["select", "from", "where", "orderBy", "limit", "insert", "values", "returning", "update", "set", "delete"].forEach(
  (m) => (mockDb[m] = vi.fn().mockReturnValue(mockDb))
);

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  companies: { id: "id", name: "name", neq: "neq", email: "email", status: "status", assignedTo: "assigned_to", deletedAt: "deleted_at" },
  documents: { companyId: "company_id", deletedAt: "deleted_at", updatedAt: "updated_at" },
  invoices: { companyId: "company_id", deletedAt: "deleted_at", updatedAt: "updated_at" },
  fiscalDeadlines: { companyId: "company_id", deletedAt: "deleted_at" },
}));

describe("DELETE /api/clients/[id] — soft delete cascade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
    mockDb.limit.mockResolvedValue([mockCompany]);
  });

  it("soft deletes company + cascades to children", async () => {
    const { DELETE } = await import("@/app/api/clients/[id]/route");
    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "comp-1" }) });
    expect(res.status).toBe(200);

    // Should call update 4 times (company, documents, invoices, fiscal_deadlines)
    expect(mockDb.update).toHaveBeenCalledTimes(4);
    // Should NOT call delete
    expect(mockDb.delete).not.toHaveBeenCalled();
  });

  it("logs SOFT_DELETE_CASCADE in audit", async () => {
    const { logAudit } = await import("@/lib/audit");
    const { DELETE } = await import("@/app/api/clients/[id]/route");
    const req = new Request("http://localhost", { method: "DELETE" });
    await DELETE(req, { params: Promise.resolve({ id: "comp-1" }) });

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SOFT_DELETE_CASCADE",
        tableName: "companies",
        recordId: "comp-1",
      })
    );
  });

  it("returns 404 for non-existent company", async () => {
    mockDb.limit.mockResolvedValueOnce([]);
    const { DELETE } = await import("@/app/api/clients/[id]/route");
    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/clients/[id] — audit trail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
    mockDb.limit.mockResolvedValue([mockCompany]);
    mockDb.returning.mockResolvedValue([{ ...mockCompany, name: "Updated" }]);
  });

  it("logs changes in audit trail", async () => {
    const { logAudit } = await import("@/lib/audit");
    const { PATCH } = await import("@/app/api/clients/[id]/route");
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    await PATCH(req, { params: Promise.resolve({ id: "comp-1" }) });

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
        tableName: "companies",
        recordId: "comp-1",
      })
    );
  });
});
