import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth";
import { hasCompanyAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { portalMessages, users } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { csrfGuard } from "@/lib/csrf";

type RouteContext = { params: Promise<{ companyId: string }> };

// GET /api/messages/[companyId] — thread complet
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireStaff();
    const { companyId } = await context.params;
    if (!(await hasCompanyAccess(user, companyId))) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const messages = await db
      .select({
        id: portalMessages.id,
        message: portalMessages.message,
        fromRole: portalMessages.fromRole,
        createdAt: portalMessages.createdAt,
        userId: portalMessages.userId,
        userName: users.name,
      })
      .from(portalMessages)
      .leftJoin(users, eq(portalMessages.userId, users.id))
      .where(eq(portalMessages.companyId, companyId))
      .orderBy(asc(portalMessages.createdAt))
      .limit(200);

    return Response.json({ messages });
  } catch {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }
}

// POST /api/messages/[companyId] — répondre en tant que staff
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const csrf = csrfGuard(request);
    if (csrf) return csrf;

    const user = await requireStaff();
    const { companyId } = await context.params;
    if (!(await hasCompanyAccess(user, companyId))) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }
    const { message } = await request.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return Response.json({ error: "Message vide" }, { status: 400 });
    }
    if (message.length > 2000) {
      return Response.json({ error: "Message trop long" }, { status: 400 });
    }

    const [msg] = await db
      .insert(portalMessages)
      .values({
        companyId,
        userId: user.id,
        message: message.trim(),
        fromRole: user.role,
      })
      .returning();

    return Response.json({ message: msg }, { status: 201 });
  } catch {
    return Response.json({ error: "Erreur" }, { status: 500 });
  }
}
