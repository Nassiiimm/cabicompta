import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  requireStaff: vi.fn().mockResolvedValue({
    id: "staff-1",
    role: "ADMIN",
    email: "admin@test.com",
    name: "Admin",
  }),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/autopilot", () => ({
  runAutopilot: vi.fn().mockResolvedValue([
    {
      companyId: "comp-1",
      companyName: "Test SARL",
      deadlinesCreated: 3,
      workflowsCreated: 3,
      docRequestsCreated: 7,
      skipped: 0,
    },
  ]),
}));

const mockDb: Record<string, any> = {};
["select", "from", "where", "groupBy", "orderBy", "limit", "innerJoin"].forEach(
  (m) => (mockDb[m] = vi.fn().mockReturnValue(mockDb))
);

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  companies: { id: "id", name: "name", type: "type", status: "status", assignedTo: "assigned_to", deletedAt: "deleted_at" },
  fiscalDeadlines: { companyId: "company_id", status: "status", dueDate: "due_date", deletedAt: "deleted_at" },
  workflows: { companyId: "company_id", status: "status", dueDate: "due_date" },
  documentRequests: { companyId: "company_id", status: "status" },
}));

// ─── POST /api/autopilot ──────────────────────────────────────────────────────

describe("POST /api/autopilot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
  });

  it("lance le pilote et retourne un résumé", async () => {
    const { POST } = await import("@/app/api/autopilot/route");
    const req = new Request("http://localhost/api/autopilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: 2025 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.year).toBe(2025);
    expect(data.companiesProcessed).toBe(1);
    expect(data.deadlinesCreated).toBe(3);
    expect(data.workflowsCreated).toBe(3);
    expect(data.docRequestsCreated).toBe(7);
    expect(data.errors).toHaveLength(0);
  });

  it("utilise l'année courante si non fournie", async () => {
    const { runAutopilot } = await import("@/lib/autopilot");
    const { POST } = await import("@/app/api/autopilot/route");
    const req = new Request("http://localhost/api/autopilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await POST(req);
    expect(runAutopilot).toHaveBeenCalledWith(
      new Date().getFullYear(),
      undefined,
      "staff-1"
    );
  });

  it("transmet les companyIds filtrés si fournis", async () => {
    const { runAutopilot } = await import("@/lib/autopilot");
    const { POST } = await import("@/app/api/autopilot/route");
    const req = new Request("http://localhost/api/autopilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: 2025, companyIds: ["comp-1", "comp-2"] }),
    });
    await POST(req);
    expect(runAutopilot).toHaveBeenCalledWith(2025, ["comp-1", "comp-2"], "staff-1");
  });

  it("reporte les erreurs par client dans la réponse", async () => {
    const { runAutopilot } = await import("@/lib/autopilot");
    (runAutopilot as any).mockResolvedValueOnce([
      { companyId: "comp-1", companyName: "OK SARL", deadlinesCreated: 2, workflowsCreated: 2, docRequestsCreated: 4, skipped: 0 },
      { companyId: "comp-2", companyName: "Error Inc", deadlinesCreated: 0, workflowsCreated: 0, docRequestsCreated: 0, skipped: 0, error: "Profil incomplet" },
    ]);
    const { POST } = await import("@/app/api/autopilot/route");
    const req = new Request("http://localhost/api/autopilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0].company).toBe("Error Inc");
    expect(data.companiesProcessed).toBe(2);
  });

  it("retourne 401 si non authentifié", async () => {
    const { requireStaff } = await import("@/lib/auth");
    (requireStaff as any).mockRejectedValueOnce(new Error("Unauthorized"));
    const { POST } = await import("@/app/api/autopilot/route");
    const req = new Request("http://localhost/api/autopilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("gère les body invalides (pas de JSON)", async () => {
    const { POST } = await import("@/app/api/autopilot/route");
    const req = new Request("http://localhost/api/autopilot", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    // Doit quand même fonctionner (body.catch retourne {})
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/autopilot ───────────────────────────────────────────────────────
// Le GET route résout :
//   allCompanies   → await db.select().from().where()      → mockDb.where
//   deadlineStats  → await db.select().from().where().groupBy() → mockDb.groupBy
//   workflowStats  → await db.select().from().where().groupBy() → mockDb.groupBy
//   pendingDocs    → await db.select().from().where().groupBy() → mockDb.groupBy

describe("GET /api/autopilot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
  });

  it("retourne le dashboard avec les stats par client", async () => {
    mockDb.where.mockResolvedValueOnce([
      { id: "comp-1", name: "Test SARL", type: "T2_SOCIETE", assignedToId: null },
      { id: "comp-2", name: "Autre Inc", type: "T1_AUTONOME", assignedToId: "staff-1" },
    ]);
    mockDb.groupBy
      .mockResolvedValueOnce([
        { companyId: "comp-1", status: "UPCOMING", cnt: 3 },
        { companyId: "comp-1", status: "OVERDUE", cnt: 1 },
      ])
      .mockResolvedValueOnce([
        { companyId: "comp-1", status: "NOT_STARTED", cnt: 2 },
      ])
      .mockResolvedValueOnce([
        { companyId: "comp-1", cnt: 5 },
      ]);

    const { GET } = await import("@/app/api/autopilot/route");
    const req = new Request("http://localhost/api/autopilot?year=2025");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.year).toBe(2025);
    expect(data.summary).toBeDefined();
    expect(data.companies).toHaveLength(2);
  });

  it("calcule correctement le risque HIGH pour un client en retard", async () => {
    mockDb.where.mockResolvedValueOnce([
      { id: "comp-1", name: "Risqué SARL", type: "T2_SOCIETE", assignedToId: null },
    ]);
    mockDb.groupBy
      .mockResolvedValueOnce([{ companyId: "comp-1", status: "OVERDUE", cnt: 2 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/autopilot/route");
    const req = new Request("http://localhost/api/autopilot?year=2025");
    const res = await GET(req);
    const data = await res.json();
    expect(data.companies[0].risk).toBe("HIGH");
    expect(data.summary.atRisk).toBe(1);
  });

  it("calcule le risque MEDIUM si pendingDocuments > 3", async () => {
    mockDb.where.mockResolvedValueOnce([
      { id: "comp-1", name: "Test Co", type: null, assignedToId: null },
    ]);
    mockDb.groupBy
      .mockResolvedValueOnce([])  // pas d'overdue deadlines
      .mockResolvedValueOnce([])  // pas de workflows NOT_STARTED
      .mockResolvedValueOnce([{ companyId: "comp-1", cnt: 5 }]);

    const { GET } = await import("@/app/api/autopilot/route");
    const req = new Request("http://localhost/api/autopilot?year=2025");
    const res = await GET(req);
    const data = await res.json();
    expect(data.companies[0].risk).toBe("MEDIUM");
  });

  it("calcule le risque LOW pour un client sans problème", async () => {
    mockDb.where.mockResolvedValueOnce([
      { id: "comp-1", name: "Sain Inc", type: null, assignedToId: null },
    ]);
    mockDb.groupBy
      .mockResolvedValueOnce([{ companyId: "comp-1", status: "FILED", cnt: 4 }])
      .mockResolvedValueOnce([{ companyId: "comp-1", status: "COMPLETED", cnt: 4 }])
      .mockResolvedValueOnce([{ companyId: "comp-1", cnt: 1 }]);

    const { GET } = await import("@/app/api/autopilot/route");
    const req = new Request("http://localhost/api/autopilot?year=2025");
    const res = await GET(req);
    const data = await res.json();
    expect(data.companies[0].risk).toBe("LOW");
  });

  it("retourne autopilotActive=false si aucune échéance", async () => {
    mockDb.where.mockResolvedValueOnce([
      { id: "comp-1", name: "Nouveau Inc", type: null, assignedToId: null },
    ]);
    mockDb.groupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/autopilot/route");
    const req = new Request("http://localhost/api/autopilot?year=2025");
    const res = await GET(req);
    const data = await res.json();
    expect(data.companies[0].autopilotActive).toBe(false);
  });

  it("utilise l'année courante si non fournie", async () => {
    mockDb.where.mockResolvedValueOnce([]);
    mockDb.groupBy.mockResolvedValue([]);
    const { GET } = await import("@/app/api/autopilot/route");
    const req = new Request("http://localhost/api/autopilot");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.year).toBe(new Date().getFullYear());
  });

  it("retourne 401 si non authentifié", async () => {
    const { requireStaff } = await import("@/lib/auth");
    (requireStaff as any).mockRejectedValueOnce(new Error("Unauthorized"));
    const { GET } = await import("@/app/api/autopilot/route");
    const req = new Request("http://localhost/api/autopilot?year=2025");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
