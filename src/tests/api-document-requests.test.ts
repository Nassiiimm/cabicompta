import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: "staff-1",
    role: "STAFF",
    email: "staff@test.com",
    name: "Staff",
  }),
}));

const mockDb: Record<string, any> = {};
["select", "from", "where", "limit", "orderBy", "update", "set", "returning", "innerJoin"].forEach(
  (m) => (mockDb[m] = vi.fn().mockReturnValue(mockDb))
);

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  documentRequests: {
    id: "id",
    companyId: "company_id",
    workflowId: "workflow_id",
    status: "status",
    createdAt: "created_at",
  },
  companyMembers: { userId: "user_id", companyId: "company_id" },
  workflows: { id: "id" },
}));

const SAMPLE_REQUEST = {
  id: "req-1",
  companyId: "comp-1",
  workflowId: "wf-1",
  label: "Relevés bancaires",
  description: "Tous les mois de l'exercice",
  required: true,
  status: "PENDING",
  documentId: null,
  dueDate: "2025-03-31",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── GET /api/document-requests ──────────────────────────────────────────────

describe("GET /api/document-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
  });

  it("retourne 400 sans companyId ni workflowId", async () => {
    const { GET } = await import("@/app/api/document-requests/route");
    const req = new Request("http://localhost/api/document-requests");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/companyId|workflowId/i);
  });

  it("retourne les demandes par companyId", async () => {
    mockDb.orderBy.mockResolvedValueOnce([SAMPLE_REQUEST]);
    const { GET } = await import("@/app/api/document-requests/route");
    const req = new Request("http://localhost/api/document-requests?companyId=comp-1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.documentRequests).toHaveLength(1);
    expect(data.documentRequests[0].id).toBe("req-1");
  });

  it("retourne les demandes par workflowId", async () => {
    mockDb.orderBy.mockResolvedValueOnce([SAMPLE_REQUEST]);
    const { GET } = await import("@/app/api/document-requests/route");
    const req = new Request("http://localhost/api/document-requests?workflowId=wf-1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.documentRequests).toHaveLength(1);
  });

  it("retourne 401 si non authentifié", async () => {
    const { requireAuth } = await import("@/lib/auth");
    (requireAuth as any).mockRejectedValueOnce(new Error("Unauthorized"));
    const { GET } = await import("@/app/api/document-requests/route");
    const req = new Request("http://localhost/api/document-requests?companyId=comp-1");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("CLIENT : retourne 403 si ne fait pas partie de la company", async () => {
    const { requireAuth } = await import("@/lib/auth");
    (requireAuth as any).mockResolvedValueOnce({ id: "client-1", role: "CLIENT" });
    mockDb.limit.mockResolvedValueOnce([]); // pas membre
    const { GET } = await import("@/app/api/document-requests/route");
    const req = new Request("http://localhost/api/document-requests?companyId=comp-autre");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("CLIENT : accès autorisé si membre de la company", async () => {
    const { requireAuth } = await import("@/lib/auth");
    (requireAuth as any).mockResolvedValueOnce({ id: "client-1", role: "CLIENT" });
    mockDb.limit.mockResolvedValueOnce([{ companyId: "comp-1" }]); // est membre
    mockDb.orderBy.mockResolvedValueOnce([SAMPLE_REQUEST]);
    const { GET } = await import("@/app/api/document-requests/route");
    const req = new Request("http://localhost/api/document-requests?companyId=comp-1");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

// ─── PATCH /api/document-requests/[id] ───────────────────────────────────────

describe("PATCH /api/document-requests/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockDb).forEach((k) => mockDb[k].mockReturnValue(mockDb));
  });

  it("retourne 404 si la demande n'existe pas", async () => {
    mockDb.limit.mockResolvedValueOnce([]); // pas trouvée
    const { PATCH } = await import("@/app/api/document-requests/[id]/route");
    const req = new Request("http://localhost/api/document-requests/missing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RECEIVED" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("met à jour le statut en RECEIVED", async () => {
    mockDb.limit.mockResolvedValueOnce([SAMPLE_REQUEST]);
    const updated = { ...SAMPLE_REQUEST, status: "RECEIVED", documentId: "doc-1" };
    mockDb.returning.mockResolvedValueOnce([updated]);
    const { PATCH } = await import("@/app/api/document-requests/[id]/route");
    const req = new Request("http://localhost/api/document-requests/req-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RECEIVED", documentId: "doc-1" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.documentRequest.status).toBe("RECEIVED");
    expect(data.documentRequest.documentId).toBe("doc-1");
  });

  it("retourne 401 si non authentifié", async () => {
    const { requireAuth } = await import("@/lib/auth");
    (requireAuth as any).mockRejectedValueOnce(new Error("Unauthorized"));
    const { PATCH } = await import("@/app/api/document-requests/[id]/route");
    const req = new Request("http://localhost/api/document-requests/req-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RECEIVED" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
    expect(res.status).toBe(401);
  });

  it("CLIENT : retourne 403 si ne fait pas partie de la company", async () => {
    const { requireAuth } = await import("@/lib/auth");
    (requireAuth as any).mockResolvedValueOnce({ id: "client-1", role: "CLIENT" });
    mockDb.limit
      .mockResolvedValueOnce([SAMPLE_REQUEST])  // demande trouvée
      .mockResolvedValueOnce([]);               // pas membre
    const { PATCH } = await import("@/app/api/document-requests/[id]/route");
    const req = new Request("http://localhost/api/document-requests/req-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RECEIVED" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
    expect(res.status).toBe(403);
  });

  it("CLIENT membre : peut marquer RECEIVED", async () => {
    const { requireAuth } = await import("@/lib/auth");
    (requireAuth as any).mockResolvedValueOnce({ id: "client-1", role: "CLIENT" });
    mockDb.limit
      .mockResolvedValueOnce([SAMPLE_REQUEST])            // demande trouvée
      .mockResolvedValueOnce([{ companyId: "comp-1" }]); // est membre
    const updated = { ...SAMPLE_REQUEST, status: "RECEIVED" };
    mockDb.returning.mockResolvedValueOnce([updated]);
    const { PATCH } = await import("@/app/api/document-requests/[id]/route");
    const req = new Request("http://localhost/api/document-requests/req-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RECEIVED" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
    expect(res.status).toBe(200);
  });

  it("ignore les champs non autorisés (ex: label)", async () => {
    mockDb.limit.mockResolvedValueOnce([SAMPLE_REQUEST]);
    const updated = { ...SAMPLE_REQUEST, status: "RECEIVED" };
    mockDb.returning.mockResolvedValueOnce([updated]);
    const { PATCH } = await import("@/app/api/document-requests/[id]/route");
    const req = new Request("http://localhost/api/document-requests/req-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RECEIVED", label: "Injection malveillante" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
    expect(res.status).toBe(200);
    // Vérifie que update().set() a été appelé sans le champ label
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.not.objectContaining({ label: "Injection malveillante" })
    );
  });
});
