import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "user-1", role: "STAFF", email: "staff@test.com", name: "Staff" }),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

const mockDb: Record<string, any> = {};
["select", "from", "where", "orderBy", "limit", "insert", "values", "returning", "update", "set", "delete", "leftJoin", "innerJoin"].forEach(
  (m) => (mockDb[m] = vi.fn().mockReturnValue(mockDb))
);

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  invoices: {
    id: "id",
    invoiceNumber: "invoice_number",
    total: "total",
    status: "status",
    companyId: "company_id",
    stripePaymentUrl: "stripe_payment_url",
    stripePaymentIntentId: "stripe_payment_intent_id",
    paidAt: "paid_at",
    paymentMethod: "payment_method",
    updatedAt: "updated_at",
  },
  companies: {
    id: "id",
    name: "name",
    email: "email",
  },
}));

describe("POST /api/invoices/[id]/payment-link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("returns a mock URL when STRIPE_SECRET_KEY not set", async () => {
    mockDb.limit.mockResolvedValueOnce([{
      id: "inv-1",
      invoiceNumber: "FAC-20260101-001",
      total: "1000.00",
      status: "SENT",
      companyName: "Test Co",
      companyEmail: "co@test.com",
    }]);

    const { POST } = await import("@/app/api/invoices/[id]/payment-link/route");
    const req = new Request("http://localhost/api/invoices/inv-1/payment-link", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.paymentUrl).toContain("payment=mock");
    expect(data.paymentUrl).toContain("FAC-20260101-001");
  });

  it("rejects DRAFT invoices (only SENT/OVERDUE)", async () => {
    mockDb.limit.mockResolvedValueOnce([{
      id: "inv-2",
      invoiceNumber: "FAC-20260101-002",
      total: "500.00",
      status: "DRAFT",
      companyName: "Draft Co",
      companyEmail: null,
    }]);

    const { POST } = await import("@/app/api/invoices/[id]/payment-link/route");
    const req = new Request("http://localhost/api/invoices/inv-2/payment-link", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "inv-2" }) });
    expect(res.status).toBe(400);
  });

  it("rejects non-existent invoice (404)", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const { POST } = await import("@/app/api/invoices/[id]/payment-link/route");
    const req = new Request("http://localhost/api/invoices/missing/payment-link", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("allows OVERDUE invoices", async () => {
    mockDb.limit.mockResolvedValueOnce([{
      id: "inv-3",
      invoiceNumber: "FAC-20260101-003",
      total: "750.00",
      status: "OVERDUE",
      companyName: "Late Co",
      companyEmail: "late@test.com",
    }]);

    const { POST } = await import("@/app/api/invoices/[id]/payment-link/route");
    const req = new Request("http://localhost/api/invoices/inv-3/payment-link", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "inv-3" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.paymentUrl).toBeTruthy();
  });

  it("returns 401 for unauthorized users", async () => {
    const { requireAuth } = await import("@/lib/auth");
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error("Unauthorized"));

    const { POST } = await import("@/app/api/invoices/[id]/payment-link/route");
    const req = new Request("http://localhost/api/invoices/inv-1/payment-link", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("handles checkout.session.completed and updates invoice to PAID", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "inv-1", status: "SENT" }]);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          payment_intent: "pi_test_456",
          metadata: { invoiceId: "inv-1", invoiceNumber: "FAC-001" },
        },
      },
    });

    const req = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);

    // Verify invoice was updated
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PAID",
        paymentMethod: "stripe",
        stripePaymentIntentId: "pi_test_456",
      })
    );
  });

  it("skips update if invoice is already PAID", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "inv-1", status: "PAID" }]);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          metadata: { invoiceId: "inv-1" },
        },
      },
    });

    const req = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    // Should NOT call update since already PAID
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("ignores events without invoiceId metadata", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_other",
          metadata: {},
        },
      },
    });

    const req = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
  });

  it("logs audit trail on payment", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "inv-1", status: "SENT" }]);

    const { logAudit } = await import("@/lib/audit");
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          payment_intent: "pi_test_789",
          metadata: { invoiceId: "inv-1" },
        },
      },
    });

    const req = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: payload,
    });

    await POST(req);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "STRIPE_PAYMENT",
        tableName: "invoices",
        recordId: "inv-1",
      })
    );
  });
});
