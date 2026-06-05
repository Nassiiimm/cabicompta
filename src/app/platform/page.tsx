import { db } from "@/lib/db";
import { cabinets, users, companies } from "@/lib/db/schema";
import { count, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateCabinetForm } from "./create-cabinet-form";
import { setCabinetStatusAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  // Requêtes volontairement CROSS-CABINET (vue plateforme)
  const [list, userCounts, companyCounts] = await Promise.all([
    db.select({
      id: cabinets.id, slug: cabinets.slug, name: cabinets.name,
      status: cabinets.status, plan: cabinets.plan, createdAt: cabinets.createdAt,
    }).from(cabinets).orderBy(desc(cabinets.createdAt)),
    db.select({ cabinetId: users.cabinetId, n: count() }).from(users).groupBy(users.cabinetId),
    db.select({ cabinetId: companies.cabinetId, n: count() }).from(companies).groupBy(companies.cabinetId),
  ]);

  const uMap = new Map(userCounts.map((r) => [r.cabinetId, r.n]));
  const cMap = new Map(companyCounts.map((r) => [r.cabinetId, r.n]));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Cabinets ({list.length})</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Cabinets</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun cabinet.</p>
          ) : (
            <div className="rounded-lg border divide-y">
              {list.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name} <span className="text-muted-foreground font-normal">/{c.slug}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {uMap.get(c.id) ?? 0} utilisateurs · {cMap.get(c.id) ?? 0} sociétés · {c.plan} · créé le {new Date(c.createdAt).toLocaleDateString("fr-CA")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={c.status === "ACTIVE" ? "default" : "destructive"}>
                      {c.status === "ACTIVE" ? "Actif" : "Suspendu"}
                    </Badge>
                    <form action={setCabinetStatusAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="status" value={c.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
                      <Button type="submit" size="xs" variant="outline">
                        {c.status === "ACTIVE" ? "Suspendre" : "Réactiver"}
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Provisionner un nouveau cabinet</CardTitle></CardHeader>
        <CardContent><CreateCabinetForm /></CardContent>
      </Card>
    </div>
  );
}
