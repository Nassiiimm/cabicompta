import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth";
import { hasCompanyAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { portalMessages } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { csrfGuard } from "@/lib/csrf";

type RouteContext = { params: Promise<{ companyId: string }> };

// POST /api/messages/[companyId]/read — marque tous les messages CLIENT comme lus
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const csrf = csrfGuard(request);
    if (csrf) return csrf;

    const user = await requireStaff();
    const { companyId } = await context.params;
    if (!(await hasCompanyAccess(user, companyId))) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    await db
      .update(portalMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(portalMessages.companyId, companyId),
          eq(portalMessages.fromRole, "CLIENT"),
          isNull(portalMessages.readAt)
        )
      );

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Erreur" }, { status: 500 });
  }
}
