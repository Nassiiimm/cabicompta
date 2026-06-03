import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        tableName: auditLogs.tableName,
        recordId: auditLogs.recordId,
        oldData: auditLogs.oldData,
        newData: auditLogs.newData,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.cabinetId, user.cabinetId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return Response.json(logs);
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
}
