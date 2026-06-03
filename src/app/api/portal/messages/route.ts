import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portalMessages, companyMembers, users } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { csrfGuard } from "@/lib/csrf";

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();

    const [membership] = await db
      .select({ companyId: companyMembers.companyId })
      .from(companyMembers)
      .where(eq(companyMembers.userId, user.id))
      .limit(1);

    if (!membership) {
      return Response.json({ messages: [] });
    }

    const messages = await db
      .select({
        id: portalMessages.id,
        message: portalMessages.message,
        fromRole: portalMessages.fromRole,
        createdAt: portalMessages.createdAt,
        userName: users.name,
        userId: portalMessages.userId,
      })
      .from(portalMessages)
      .leftJoin(users, eq(portalMessages.userId, users.id))
      .where(eq(portalMessages.companyId, membership.companyId))
      .orderBy(asc(portalMessages.createdAt))
      .limit(100);

    return Response.json({ messages });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrf = csrfGuard(request);
    if (csrf) return csrf;

    const user = await requireAuth();
    const { message } = await request.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return Response.json({ error: "Message vide" }, { status: 400 });
    }
    if (message.length > 2000) {
      return Response.json({ error: "Message trop long (max 2000 caractères)" }, { status: 400 });
    }

    const [membership] = await db
      .select({ companyId: companyMembers.companyId })
      .from(companyMembers)
      .where(eq(companyMembers.userId, user.id))
      .limit(1);

    if (!membership) {
      return Response.json({ error: "Aucune entreprise associée" }, { status: 403 });
    }

    const [msg] = await db
      .insert(portalMessages)
      .values({
        cabinetId: user.cabinetId,
        companyId: membership.companyId,
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
