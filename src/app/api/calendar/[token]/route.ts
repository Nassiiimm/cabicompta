import { db } from "@/lib/db";
import { users, fiscalDeadlines, companies, companyMembers, cabinets } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { buildIcs } from "@/lib/calendar";

// Flux iCal des échéances — authentifié par le jeton dans l'URL (pas de session,
// exclu du proxy). Scopé au cabinet ET au rôle de l'utilisateur propriétaire du jeton.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  // token = "<uuid>.ics" ou "<uuid>"
  const clean = token.replace(/\.ics$/, "");

  // La colonne est de type uuid : un token malformé ferait planter la requête
  // (invalid input syntax for type uuid) → 404 propre avant de toucher la DB.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(clean)) return new Response("Not found", { status: 404 });

  const [u] = await db
    .select({ id: users.id, cabinetId: users.cabinetId, role: users.role })
    .from(users)
    .where(eq(users.calendarToken, clean))
    .limit(1);
  if (!u) return new Response("Not found", { status: 404 });

  const [cab] = await db.select({ name: cabinets.name, displayName: cabinets.displayName }).from(cabinets).where(eq(cabinets.id, u.cabinetId)).limit(1);
  const cabName = cab?.displayName ?? cab?.name ?? "CabiCompta";

  // Cloisonnement par rôle : sociétés autorisées (null = toutes celles du cabinet)
  let allowedCompanyIds: string[] | null = null;
  if (u.role === "CLIENT") {
    const m = await db.select({ id: companyMembers.companyId }).from(companyMembers).where(eq(companyMembers.userId, u.id));
    allowedCompanyIds = m.map((r) => r.id);
  } else if (u.role === "INTERN") {
    const c = await db.select({ id: companies.id }).from(companies).where(and(eq(companies.cabinetId, u.cabinetId), eq(companies.assignedTo, u.id)));
    allowedCompanyIds = c.map((r) => r.id);
  }

  const conds = [eq(fiscalDeadlines.cabinetId, u.cabinetId), eq(fiscalDeadlines.status, "UPCOMING")];
  if (allowedCompanyIds !== null) {
    if (allowedCompanyIds.length === 0) {
      // aucun accès → calendrier vide
      return ics([], cabName);
    }
    conds.push(inArray(fiscalDeadlines.companyId, allowedCompanyIds));
  }

  const rows = await db
    .select({
      id: fiscalDeadlines.id, label: fiscalDeadlines.label, dueDate: fiscalDeadlines.dueDate,
      type: fiscalDeadlines.type, status: fiscalDeadlines.status, companyName: companies.name,
    })
    .from(fiscalDeadlines)
    .leftJoin(companies, eq(fiscalDeadlines.companyId, companies.id))
    .where(and(...conds));

  return ics(rows, cabName);
}

function ics(rows: Parameters<typeof buildIcs>[0], cabinetName: string): Response {
  const body = buildIcs(rows, cabinetName);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="echeances.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
