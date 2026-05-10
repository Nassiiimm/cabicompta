import { db } from "@/lib/db";
import { accessLogs } from "@/lib/db/schema";

type AccessLogParams = {
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
};

export async function logAccess(params: AccessLogParams) {
  try {
    await db.insert(accessLogs).values({
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });
  } catch {
    console.error("[ACCESS_LOG] Erreur d'écriture");
  }
}
