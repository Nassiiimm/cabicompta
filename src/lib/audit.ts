import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

type AuditParams = {
  userId: string | null;
  action: string;
  tableName: string;
  recordId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
};

export async function logAudit(params: AuditParams) {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId,
      action: params.action,
      tableName: params.tableName,
      recordId: params.recordId ?? null,
      oldData: params.oldData ?? null,
      newData: params.newData ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch {
    // Ne jamais bloquer une opération métier à cause de l'audit
    console.error("[AUDIT] Erreur d'écriture audit log");
  }
}
