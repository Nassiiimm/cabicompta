import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/email", () => ({
  sendInvoiceOverdueEmail: vi.fn().mockResolvedValue(true),
}));

const mockDb: Record<string, any> = {};
["select", "from", "where", "orderBy", "limit", "insert", "values", "returning", "update", "set", "delete", "innerJoin", "leftJoin"].forEach(
  (m) => (mockDb[m] = vi.fn().mockReturnValue(mockDb))
);

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  invoices: {
    id: "id",
    invoiceNumber: "invoice_number",
    total: "total",
    dueDate: "due_date",
    companyId: "company_id",
    status: "status",
    updatedAt: "updated_at",
  },
  companies: {
    id: "id",
    name: "name",
  },
  companyMembers: {
    userId: "user_id",
    companyId: "company_id",
  },
  notifications: {
    id: "id",
    userId: "user_id",
    title: "title",
    message: "message",
    type: "type",
    link: "link",
    createdAt: "created_at",
  },
  users: {
    id: "id",
    name: "name",
    email: "email",
  },
}));

describe("GET /api/fiscal/check-invoices (cron)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
    process.env.CRON_SECRET = "test-secret";
  });

  const cronReq = (url: string) =>
    new Request(url, { headers: { authorization: "Bearer test-secret" } });

  it("finds SENT invoices past due date and marks OVERDUE", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    // Query chain for overdue invoices: select().from().innerJoin().where() → resolves
    // Then update: update().set().where() → resolves
    // Then members: select().from().innerJoin().where() → resolves
    // Then dedup: select().from().where().limit() → resolves
    // Then insert: insert().values() → resolves

    mockDb.where
      .mockResolvedValueOnce([                    // 1st where: overdue invoices query
        {
          id: "inv-1",
          invoiceNumber: "FAC-001",
          total: "1000.00",
          dueDate: pastDate.toISOString().split("T")[0],
          companyId: "comp-1",
          companyName: "Retard Inc.",
        },
      ])
      .mockReturnValueOnce(mockDb)                // 2nd where: update invoice status (chain)
      .mockResolvedValueOnce([                    // 3rd where: members query
        { userId: "user-1", userName: "Client One", userEmail: "c1@test.com" },
      ])
      .mockReturnValueOnce(mockDb);               // 4th where: dedup check (chains to .limit())

    mockDb.limit.mockResolvedValueOnce([]);        // dedup: no existing notification

    const { GET } = await import("@/app/api/fiscal/check-invoices/route");
    const req = cronReq("http://localhost/api/fiscal/check-invoices");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.overdueCount).toBe(1);
    expect(data.notificationsSent).toBe(1);
  });

  it("sends notifications to company members", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    mockDb.where
      .mockResolvedValueOnce([                    // overdue invoices
        {
          id: "inv-2",
          invoiceNumber: "FAC-002",
          total: "500.00",
          dueDate: pastDate.toISOString().split("T")[0],
          companyId: "comp-2",
          companyName: "Late Co",
        },
      ])
      .mockReturnValueOnce(mockDb)                // update status
      .mockResolvedValueOnce([                    // members
        { userId: "user-1", userName: "Member A", userEmail: "a@test.com" },
        { userId: "user-2", userName: "Member B", userEmail: "b@test.com" },
      ])
      .mockReturnValueOnce(mockDb)                // dedup check member A → chains to limit
      .mockReturnValueOnce(mockDb);               // dedup check member B → chains to limit

    mockDb.limit
      .mockResolvedValueOnce([])                  // no existing notification for member A
      .mockResolvedValueOnce([]);                 // no existing notification for member B

    const { sendInvoiceOverdueEmail } = await import("@/lib/email");
    const { GET } = await import("@/app/api/fiscal/check-invoices/route");
    const req = cronReq("http://localhost/api/fiscal/check-invoices");
    const res = await GET(req);

    const data = await res.json();
    expect(data.notificationsSent).toBe(2);
    expect(sendInvoiceOverdueEmail).toHaveBeenCalledTimes(2);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("returns count of overdue invoices (0 when none)", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/fiscal/check-invoices/route");
    const req = cronReq("http://localhost/api/fiscal/check-invoices");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.overdueCount).toBe(0);
    expect(data.notificationsSent).toBe(0);
    expect(data.checked).toBeTruthy();
  });

  it("rejects when CRON_SECRET is not configured (fail-closed)", async () => {
    delete process.env.CRON_SECRET;

    const { GET } = await import("@/app/api/fiscal/check-invoices/route");
    const req = new Request("http://localhost/api/fiscal/check-invoices");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("rejects wrong CRON_SECRET", async () => {
    process.env.CRON_SECRET = "my-secret-key";

    const { GET } = await import("@/app/api/fiscal/check-invoices/route");
    const req = new Request("http://localhost/api/fiscal/check-invoices", {
      headers: { authorization: "Bearer wrong-key" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("allows request with correct CRON_SECRET", async () => {
    process.env.CRON_SECRET = "my-secret-key";
    mockDb.where.mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/fiscal/check-invoices/route");
    const req = new Request("http://localhost/api/fiscal/check-invoices", {
      headers: { authorization: "Bearer my-secret-key" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
