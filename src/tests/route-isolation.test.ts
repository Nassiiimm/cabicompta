// @vitest-environment node
//
// ISOLATION PAR ROUTE (intégration, vraie base) — le filet qui prouve qu'AUCUNE
// route de liste/lecture ne laisse fuiter les données d'un autre cabinet.
// Sème 2 cabinets A/B, mocke l'auth comme user ADMIN de A, appelle les VRAIS
// handlers et asserte que les marqueurs de B sont ABSENTS de la réponse.
// Skippé si base locale absente.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/cabicompta_dev";

// Auth mockée : tous les helpers renvoient l'utilisateur courant (ADMIN du cabinet A)
const h = vi.hoisted(() => ({ user: null as null | { id: string; cabinetId: string; role: string; authId: string; email: string; name: string } }));
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => h.user),
  requireStaff: vi.fn(async () => h.user),
  requireAdmin: vi.fn(async () => h.user),
  getCurrentUser: vi.fn(async () => h.user),
  getSession: vi.fn(async () => ({ id: h.user?.authId })),
}));

const { db } = await import("@/lib/db");
const schema = await import("@/lib/db/schema");
const { inArray, sql } = await import("drizzle-orm");
const {
  cabinets, users, companies, workflows, documentRequests, invoices,
  portalMessages, notifications, auditLogs, accessLogs, kycDocuments,
} = schema;

let dbReady = false;
try { await db.execute(sql`select 1`); dbReady = true; }
catch { console.warn("[route-isolation] Base locale injoignable — SKIPPÉ."); }

// Cabinets + entités, avec marqueurs distinctifs par cabinet
function ids(tag: string) {
  return { cabinet: randomUUID(), user: randomUUID(), company: randomUUID(), workflow: randomUUID() };
}
const A = ids("A");
const B = ids("B");

async function seed(tag: string, x: ReturnType<typeof ids>) {
  await db.insert(cabinets).values({ id: x.cabinet, slug: `ri-${tag}-${x.cabinet.slice(0, 8)}`, name: `Cabinet ${tag}` });
  await db.insert(users).values({ id: x.user, cabinetId: x.cabinet, authId: `ri-auth-${x.user}`, email: `ri-${tag}-${x.user}@t.local`, name: `Admin ${tag}`, role: "ADMIN" });
  await db.insert(companies).values({ id: x.company, cabinetId: x.cabinet, name: `SOC-${tag}` });
  await db.insert(workflows).values({ id: x.workflow, cabinetId: x.cabinet, companyId: x.company, name: `WF-${tag}` });
  await db.insert(documentRequests).values({ cabinetId: x.cabinet, companyId: x.company, workflowId: x.workflow, label: `DR-${tag}` });
  await db.insert(invoices).values({ cabinetId: x.cabinet, companyId: x.company, invoiceNumber: `INV-${tag}`, amountHt: "100.00", tps: "5.00", tvq: "9.98", total: tag === "A" ? "111.11" : "222.22", status: "SENT", issuedAt: new Date() });
  await db.insert(portalMessages).values({ cabinetId: x.cabinet, companyId: x.company, userId: x.user, message: `MSG-${tag}`, fromRole: "CLIENT" });
  await db.insert(notifications).values({ cabinetId: x.cabinet, userId: x.user, title: `NOTIF-${tag}`, message: "m", type: "SYSTEM" });
  await db.insert(auditLogs).values({ cabinetId: x.cabinet, userId: x.user, action: `AUD-${tag}`, tableName: "t" });
  await db.insert(accessLogs).values({ cabinetId: x.cabinet, userId: x.user, action: `ACC-${tag}`, resourceType: "r" });
  await db.insert(kycDocuments).values({ cabinetId: x.cabinet, companyId: x.company, adminName: `KYC-${tag}`, adminRole: "Dir", documentType: "ID" });
}

const req = (url: string) => new NextRequest(`http://localhost${url}`);

describe.skipIf(!dbReady)("Isolation par route (A ne voit jamais B)", () => {
  beforeAll(async () => {
    await seed("A", A);
    await seed("B", B);
    h.user = { id: A.user, cabinetId: A.cabinet, role: "ADMIN", authId: `ri-auth-${A.user}`, email: "a@t.local", name: "Admin A" };
  });

  afterAll(async () => {
    const cabs = [A.cabinet, B.cabinet];
    for (const t of [kycDocuments, documentRequests, portalMessages, notifications, auditLogs, accessLogs, invoices, workflows, companies, users]) {
      await db.delete(t).where(inArray(t.cabinetId, cabs));
    }
    await db.delete(cabinets).where(inArray(cabinets.id, cabs));
  });

  async function bodyOf(res: Response) { return await res.text(); }

  it("GET /api/clients — pas de SOC-B", async () => {
    const { GET } = await import("@/app/api/clients/route");
    const body = await bodyOf(await GET(req("/api/clients")));
    expect(body).toContain("SOC-A");
    expect(body).not.toContain("SOC-B");
  });

  it("GET /api/search — pas de SOC-B", async () => {
    const { GET } = await import("@/app/api/search/route");
    const body = await bodyOf(await GET(req("/api/search?q=SOC")));
    expect(body).toContain("SOC-A");
    expect(body).not.toContain("SOC-B");
  });

  it("GET /api/messages — pas de SOC-B", async () => {
    const { GET } = await import("@/app/api/messages/route");
    const body = await bodyOf(await GET(req("/api/messages")));
    expect(body).not.toContain("SOC-B");
  });

  it("GET /api/document-requests — companyId de B renvoie vide pour user A", async () => {
    const { GET } = await import("@/app/api/document-requests/route");
    const a = await bodyOf(await GET(req(`/api/document-requests?companyId=${A.company}`)));
    expect(a).toContain("DR-A");
    const b = await bodyOf(await GET(req(`/api/document-requests?companyId=${B.company}`)));
    expect(b).not.toContain("DR-B");
  });

  it("GET /api/notifications — pas de NOTIF-B", async () => {
    const { GET } = await import("@/app/api/notifications/route");
    const body = await bodyOf(await GET());
    expect(body).not.toContain("NOTIF-B");
  });

  it("GET /api/analytics/revenue — n'inclut pas le CA de B (222.22)", async () => {
    const { GET } = await import("@/app/api/analytics/revenue/route");
    const body = await bodyOf(await GET());
    expect(body).not.toContain("222.22");
  });

  it("GET /api/admin/audit-logs — pas de AUD-B", async () => {
    const { GET } = await import("@/app/api/admin/audit-logs/route");
    const body = await bodyOf(await GET(req("/api/admin/audit-logs")));
    expect(body).not.toContain("AUD-B");
  });

  it("GET /api/admin/access-logs — pas de ACC-B", async () => {
    const { GET } = await import("@/app/api/admin/access-logs/route");
    const body = await bodyOf(await GET(req("/api/admin/access-logs")));
    expect(body).not.toContain("ACC-B");
  });

  it("GET /api/export/clients — CSV sans SOC-B", async () => {
    const { GET } = await import("@/app/api/export/clients/route");
    const body = await bodyOf(await GET());
    expect(body).toContain("SOC-A");
    expect(body).not.toContain("SOC-B");
  });

  it("GET /api/export/invoices — CSV sans INV-B", async () => {
    const { GET } = await import("@/app/api/export/invoices/route");
    const body = await bodyOf(await GET());
    expect(body).not.toContain("INV-B");
  });

  it("GET /api/kyc — société de A OK, société de B refusée (403)", async () => {
    const { GET } = await import("@/app/api/kyc/route");
    const a = await GET(req(`/api/kyc?companyId=${A.company}`));
    expect(await bodyOf(a)).toContain("KYC-A");
    const b = await GET(req(`/api/kyc?companyId=${B.company}`));
    expect(b.status).toBe(403);
  });
});
