import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { activitySessions } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

// Heartbeat de présence : appelé périodiquement par le client tant que
// l'employé est actif. On accumule le temps réel actif (delta capé à 120s
// pour absorber un ping manqué sans surcompter). Une ligne par (user, jour).
export async function POST() {
  try {
    const user = await requireStaff();
    const today = new Date().toISOString().slice(0, 10);

    await db
      .insert(activitySessions)
      .values({ userId: user.id, date: today, activeSeconds: 0 })
      .onConflictDoUpdate({
        target: [activitySessions.userId, activitySessions.date],
        set: {
          activeSeconds: sql`${activitySessions.activeSeconds} + least(extract(epoch from (now() - ${activitySessions.lastHeartbeatAt})), 120)::int`,
          lastHeartbeatAt: sql`now()`,
        },
      });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
