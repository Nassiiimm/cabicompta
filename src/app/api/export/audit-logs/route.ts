import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  try {
    const user = await requireAdmin();

    const rows = await db
      .select({
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
        action: auditLogs.action,
        tableName: auditLogs.tableName,
        recordId: auditLogs.recordId,
        oldData: auditLogs.oldData,
        newData: auditLogs.newData,
        ipAddress: auditLogs.ipAddress,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.cabinetId, user.cabinetId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10000);

    const formatted = rows.map((r) => ({
      ...r,
      oldData: r.oldData ? JSON.stringify(r.oldData) : "",
      newData: r.newData ? JSON.stringify(r.newData) : "",
    }));

    const csv = generateCsv(
      [
        { key: "createdAt", label: "Date" },
        { key: "userName", label: "Utilisateur" },
        { key: "userEmail", label: "Courriel" },
        { key: "action", label: "Action" },
        { key: "tableName", label: "Table" },
        { key: "recordId", label: "ID enregistrement" },
        { key: "oldData", label: "Données avant" },
        { key: "newData", label: "Données après" },
        { key: "ipAddress", label: "Adresse IP" },
      ],
      formatted
    );

    return csvResponse(csv, `audit-${new Date().toISOString().split("T")[0]}.csv`);
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
}
