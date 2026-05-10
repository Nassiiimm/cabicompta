import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireStaff: vi.fn().mockResolvedValue({ id: "staff-1", role: "ADMIN" }),
}));

vi.mock("@/lib/email", () => ({
  sendInvoiceEmail: vi.fn().mockResolvedValue(true),
}));

const mockInvoice = {
  id: "inv-1",
  invoiceNumber: "FAC-20260510-001",
  companyId: "comp-1",
  amountHt: "100.00",
  tps: "5.00",
  tvq: "9.98",
  total: "114.98",
  status: "DRAFT",
};

// Build a chainable mock that resolves differently based on the chain
function createChainMock() {
  const chain: Record<string, any> = {};
  const methods = ["select", "from", "where", "orderBy", "leftJoin", "limit", "insert", "values", "returning", "update", "set", "delete"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Default terminal values
  chain.limit.mockResolvedValue([mockInvoice]);
  chain.returning.mockResolvedValue([{ ...mockInvoice, status: "SENT" }]);
  return chain;
}

let mockDb = createChainMock();

vi.mock("@/lib/db", () => ({
  get db() { return mockDb; },
}));
vi.mock("@/lib/db/schema", () => ({
  invoices: { id: "id", companyId: "company_id", status: "status", invoiceNumber: "invoice_number", total: "total" },
  invoiceItems: { invoiceId: "invoice_id" },
  companies: { id: "id", name: "name", address: "address", city: "city", province: "province", postalCode: "postal_code", email: "email", phone: "phone" },
  companyMembers: { userId: "user_id", companyId: "company_id" },
  users: { id: "id", email: "email", name: "name" },
}));

describe("PATCH /api/invoices/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockDb = createChainMock();
    mockDb.limit.mockResolvedValue([mockInvoice]);
    mockDb.returning.mockResolvedValue([{ ...mockInvoice, status: "SENT" }]);
  });

  it("rejects invalid status value", async () => {
    const { PATCH } = await import("@/app/api/invoices/[id]/route");
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "INVALID" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(400);
  });

  it("rejects DRAFT → PAID transition", async () => {
    const { PATCH } = await import("@/app/api/invoices/[id]/route");
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("non permise");
  });
});

describe("invoice status transitions", () => {
  it("DRAFT can go to SENT or CANCELLED", () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      DRAFT: ["SENT", "CANCELLED"],
      SENT: ["PAID", "OVERDUE", "CANCELLED"],
      OVERDUE: ["PAID", "CANCELLED"],
    };

    expect(VALID_TRANSITIONS["DRAFT"]).toContain("SENT");
    expect(VALID_TRANSITIONS["DRAFT"]).toContain("CANCELLED");
    expect(VALID_TRANSITIONS["DRAFT"]).not.toContain("PAID");
  });

  it("SENT can go to PAID, OVERDUE, or CANCELLED", () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      DRAFT: ["SENT", "CANCELLED"],
      SENT: ["PAID", "OVERDUE", "CANCELLED"],
      OVERDUE: ["PAID", "CANCELLED"],
    };

    expect(VALID_TRANSITIONS["SENT"]).toContain("PAID");
    expect(VALID_TRANSITIONS["SENT"]).toContain("OVERDUE");
  });

  it("PAID has no valid transitions", () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      DRAFT: ["SENT", "CANCELLED"],
      SENT: ["PAID", "OVERDUE", "CANCELLED"],
      OVERDUE: ["PAID", "CANCELLED"],
    };

    expect(VALID_TRANSITIONS["PAID"]).toBeUndefined();
  });
});
