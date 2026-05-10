import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "staff-1", role: "STAFF", email: "staff@test.com", name: "Staff" }),
}));

vi.mock("@/lib/access-log", () => ({
  logAccess: vi.fn(),
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
    amountHt: "amount_ht",
    tps: "tps",
    tvq: "tvq",
    total: "total",
    tpsRate: "tps_rate",
    tvqRate: "tvq_rate",
    status: "status",
    issuedAt: "issued_at",
    dueDate: "due_date",
    paidAt: "paid_at",
    notes: "notes",
    companyId: "company_id",
  },
  invoiceItems: {
    id: "id",
    invoiceId: "invoice_id",
    description: "description",
    quantity: "quantity",
    unitPrice: "unit_price",
    amount: "amount",
  },
  companies: {
    id: "id",
    name: "name",
    address: "address",
    city: "city",
    province: "province",
    postalCode: "postal_code",
    email: "email",
    phone: "phone",
    neq: "neq",
  },
  companyMembers: {
    userId: "user_id",
    companyId: "company_id",
  },
}));

const mockInvoice = {
  id: "inv-1",
  invoiceNumber: "FAC-20260510-001",
  amountHt: "1000.00",
  tps: "50.00",
  tvq: "99.75",
  total: "1149.75",
  tpsRate: "5",
  tvqRate: "9.975",
  status: "SENT",
  issuedAt: "2026-05-01",
  dueDate: "2026-06-01",
  paidAt: null,
  notes: null,
  companyName: "Acme Inc.",
  companyAddress: "123 Main St",
  companyCity: "Montreal",
  companyProvince: "QC",
  companyPostalCode: "H2X 1A1",
  companyEmail: "acme@test.com",
  companyPhone: "514-555-1234",
  companyNeq: "1234567890",
  companyId: "comp-1",
};

const mockItems = [
  { id: "item-1", invoiceId: "inv-1", description: "Consulting", quantity: "10", unitPrice: "100.00", amount: "1000.00" },
];

function setupInvoiceFound() {
  // Chain: select().from().leftJoin().where().limit() → invoice
  // Then:  select().from().where() → items
  mockDb.limit.mockResolvedValueOnce([mockInvoice]);
  // After the invoice query, the items query ends at where()
  mockDb.where
    .mockReturnValueOnce(mockDb)       // invoice chain: where() → chainable for .limit()
    .mockResolvedValueOnce(mockItems); // items chain: where() → resolves to items
}

describe("GET /api/invoices/[id]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
  });

  it("returns HTML content type", async () => {
    setupInvoiceFound();

    const { GET } = await import("@/app/api/invoices/[id]/pdf/route");
    const req = new Request("http://localhost/api/invoices/inv-1/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.headers.get("Content-Type")).toContain("text/html");
  });

  it("includes invoice number in the response", async () => {
    setupInvoiceFound();

    const { GET } = await import("@/app/api/invoices/[id]/pdf/route");
    const req = new Request("http://localhost/api/invoices/inv-1/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "inv-1" }) });
    const html = await res.text();
    expect(html).toContain("FAC-20260510-001");
  });

  it("returns 404 for non-existent invoice", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/invoices/[id]/pdf/route");
    const req = new Request("http://localhost/api/invoices/missing/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("CLIENT cannot access other company invoices (403)", async () => {
    const { requireAuth } = await import("@/lib/auth");
    vi.mocked(requireAuth).mockResolvedValueOnce({ id: "client-1", role: "CLIENT", email: "c@t.com", name: "Client", authId: "a", phone: null, avatarUrl: null });

    // Invoice lookup chain: where() chainable, limit() resolves
    mockDb.where.mockReturnValueOnce(mockDb);
    mockDb.limit
      .mockResolvedValueOnce([mockInvoice])   // invoice found
      .mockResolvedValueOnce([]);             // membership check — no match

    const { GET } = await import("@/app/api/invoices/[id]/pdf/route");
    const req = new Request("http://localhost/api/invoices/inv-1/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(403);
  });

  it("CLIENT with membership can access their invoice PDF", async () => {
    const { requireAuth } = await import("@/lib/auth");
    vi.mocked(requireAuth).mockResolvedValueOnce({ id: "client-1", role: "CLIENT", email: "c@t.com", name: "Client", authId: "a", phone: null, avatarUrl: null });

    // Invoice lookup: where() chainable → limit() resolves to invoice
    // Membership check: where() chainable → limit() resolves to membership
    // Items query: where() resolves to items
    mockDb.where
      .mockReturnValueOnce(mockDb)             // invoice chain where()
      .mockReturnValueOnce(mockDb)             // membership chain where()
      .mockResolvedValueOnce(mockItems);       // items chain where()
    mockDb.limit
      .mockResolvedValueOnce([mockInvoice])    // invoice found
      .mockResolvedValueOnce([{ companyId: "comp-1" }]); // membership found

    const { GET } = await import("@/app/api/invoices/[id]/pdf/route");
    const req = new Request("http://localhost/api/invoices/inv-1/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "inv-1" }) });
    const html = await res.text();
    expect(html).toContain("FAC-20260510-001");
    expect(html).toContain("Acme Inc.");
  });

  it("returns 401 for unauthorized users", async () => {
    const { requireAuth } = await import("@/lib/auth");
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error("Unauthorized"));

    const { GET } = await import("@/app/api/invoices/[id]/pdf/route");
    const req = new Request("http://localhost/api/invoices/inv-1/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(401);
  });

  it("logs access for PDF download", async () => {
    setupInvoiceFound();

    const { logAccess } = await import("@/lib/access-log");
    const { GET } = await import("@/app/api/invoices/[id]/pdf/route");
    const req = new Request("http://localhost/api/invoices/inv-1/pdf");
    await GET(req, { params: Promise.resolve({ id: "inv-1" }) });

    expect(logAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "INVOICE_PDF_DOWNLOAD",
        resourceType: "invoice",
        resourceId: "inv-1",
      })
    );
  });
});
