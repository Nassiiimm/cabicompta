import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { portalMessages, companies, users } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

// GET /api/messages — liste des conversations (une par entreprise)
export async function GET(_request: NextRequest) {
  try {
    const user = await requireStaff();

    // Derniers messages par entreprise + unread count (messages CLIENT sans réponse staff après)
    const threads = await db
      .selectDistinctOn([portalMessages.companyId], {
        companyId: portalMessages.companyId,
        companyName: companies.name,
        lastMessage: portalMessages.message,
        lastFromRole: portalMessages.fromRole,
        lastAt: portalMessages.createdAt,
        lastUserName: users.name,
        unread: sql<number>`(
          SELECT COUNT(*)::int FROM portal_messages pm2
          WHERE pm2.company_id = ${portalMessages.companyId}
            AND pm2.from_role = 'CLIENT'
            AND pm2.created_at > COALESCE(
              (SELECT MAX(pm3.created_at) FROM portal_messages pm3
               WHERE pm3.company_id = ${portalMessages.companyId}
                 AND pm3.from_role != 'CLIENT'),
              '1970-01-01'::timestamptz
            )
        )`,
      })
      .from(portalMessages)
      .leftJoin(companies, eq(portalMessages.companyId, companies.id))
      .leftJoin(users, eq(portalMessages.userId, users.id))
      .where(eq(portalMessages.cabinetId, user.cabinetId))
      .orderBy(portalMessages.companyId, desc(portalMessages.createdAt));

    // Trier par lastAt desc
    threads.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

    return Response.json({ threads });
  } catch {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }
}
