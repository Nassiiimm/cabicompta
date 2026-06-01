import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

// Le client consent à l'analyse de ses documents par l'IA (OCR/classement).
// Horodaté (auditable) et non redemandé ensuite.
export async function POST() {
  try {
    const user = await requireAuth();
    if (user.role !== "CLIENT") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .update(users)
      .set({ aiConsentAckedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    logAudit({
      userId: user.id,
      action: "AI_CONSENT_ACK",
      tableName: "users",
      recordId: user.id,
      newData: { aiConsentAckedAt: new Date().toISOString() },
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
