import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { accessLogs, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

    const logs = await db
      .select({
        id: accessLogs.id,
        action: accessLogs.action,
        resourceType: accessLogs.resourceType,
        resourceId: accessLogs.resourceId,
        ipAddress: accessLogs.ipAddress,
        userAgent: accessLogs.userAgent,
        createdAt: accessLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(accessLogs)
      .leftJoin(users, eq(accessLogs.userId, users.id))
      .orderBy(desc(accessLogs.createdAt))
      .limit(limit);

    return Response.json(logs);
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
}
