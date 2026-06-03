import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

// Loi 25 : l'employé acquitte la notice de surveillance de présence.
// On horodate l'acquittement (auditable) et on ne le redemande plus.
export async function POST() {
  try {
    const user = await requireStaff();

    await db
      .update(users)
      .set({ presenceNoticeAckedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    logAudit({
      cabinetId: user.cabinetId,
      userId: user.id,
      action: "PRESENCE_NOTICE_ACK",
      tableName: "users",
      recordId: user.id,
      newData: { presenceNoticeAckedAt: new Date().toISOString() },
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
