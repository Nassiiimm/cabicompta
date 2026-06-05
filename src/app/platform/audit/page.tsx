import { db } from "@/lib/db";
import { platformAuditLogs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const logs = await db
    .select()
    .from(platformAuditLogs)
    .orderBy(desc(platformAuditLogs.createdAt))
    .limit(200);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Journal d&apos;audit plateforme</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">200 dernières actions</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune action enregistrée.</p>
          ) : (
            <div className="rounded-lg border divide-y text-sm">
              {logs.map((l) => (
                <div key={l.id} className="px-4 py-2 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="font-mono text-xs">{l.action}</span>
                    {l.targetType && <span className="text-muted-foreground"> · {l.targetType}:{l.targetId?.slice(0, 8)}</span>}
                    <span className="text-muted-foreground"> · {l.actorEmail ?? "—"}</span>
                    {l.meta != null && <span className="block text-xs text-muted-foreground truncate">{JSON.stringify(l.meta)}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.createdAt).toLocaleString("fr-CA")}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
