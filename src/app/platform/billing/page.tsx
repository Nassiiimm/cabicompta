import { db } from "@/lib/db";
import { cabinets } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

// MAQUETTE — la facturation réelle (Stripe Billing) sera branchée une fois
// l'encaissement résolu. Pour l'instant : aperçu des plans par cabinet.
export default async function BillingPage() {
  const list = await db
    .select({ id: cabinets.id, name: cabinets.name, plan: cabinets.plan, status: cabinets.status })
    .from(cabinets).orderBy(desc(cabinets.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Facturation</h1>
        <Badge variant="secondary">Maquette — Stripe Billing à venir</Badge>
      </div>
      <p className="text-sm text-muted-foreground max-w-2xl">
        Module à brancher sur Stripe Billing (abonnements, MRR, essais, relances)
        une fois l&apos;encaissement mis en place. Ci-dessous, le plan actuel de chaque cabinet
        (champ <code className="font-mono">plan</code>, éditable depuis la fiche cabinet).
      </p>
      <Card>
        <CardHeader><CardTitle className="text-sm">Plans par cabinet</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {list.map((c) => (
            <div key={c.id} className="flex justify-between py-2 text-sm">
              <span className="font-medium">{c.name}</span>
              <span className="flex items-center gap-2">
                <Badge variant="outline">{c.plan}</Badge>
                <span className="text-muted-foreground text-xs">— MRR à venir</span>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
