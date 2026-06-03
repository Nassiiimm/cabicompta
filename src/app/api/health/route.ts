import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// Sonde de santé publique (pour un moniteur d'uptime externe : UptimeRobot,
// BetterStack…). Vérifie la connectivité DB. Pas de session (exclu du proxy).
export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    await db.execute(sql`select 1`);
    return Response.json({
      status: "ok",
      db: "up",
      latencyMs: Date.now() - start,
      ts: new Date().toISOString(),
    });
  } catch {
    return Response.json(
      { status: "degraded", db: "down", latencyMs: Date.now() - start, ts: new Date().toISOString() },
      { status: 503 }
    );
  }
}
