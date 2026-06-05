import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cabinets, users, companies } from "@/lib/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setCabinetStatusAction, impersonateAction } from "../../actions";
import { EditCabinetForm } from "./edit-cabinet-form";
import { DeleteCabinetForm } from "./delete-cabinet-form";

export const dynamic = "force-dynamic";

export default async function CabinetDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cab] = await db.select().from(cabinets).where(eq(cabinets.id, id)).limit(1);
  if (!cab) notFound();

  const [cabUsers, [comp]] = await Promise.all([
    db.select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt })
      .from(users).where(eq(users.cabinetId, id)).orderBy(desc(users.createdAt)),
    db.select({ v: count() }).from(companies).where(eq(companies.cabinetId, id)),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/platform/cabinets" className="text-xs text-muted-foreground hover:text-foreground">← Cabinets</Link>
          <h1 className="text-lg font-semibold mt-1">{cab.name} <span className="text-muted-foreground font-normal">/{cab.slug}</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={cab.status === "ACTIVE" ? "default" : "destructive"}>{cab.status === "ACTIVE" ? "Actif" : "Suspendu"}</Badge>
          <form action={setCabinetStatusAction}>
            <input type="hidden" name="id" value={cab.id} />
            <input type="hidden" name="status" value={cab.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
            <Button type="submit" size="sm" variant="outline">{cab.status === "ACTIVE" ? "Suspendre" : "Réactiver"}</Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: "Plan", v: cab.plan },
          { l: "Utilisateurs", v: String(cabUsers.length) },
          { l: "Sociétés", v: String(comp?.v ?? 0) },
          { l: "Créé le", v: new Date(cab.createdAt).toLocaleDateString("fr-CA") },
        ].map((m) => (
          <Card key={m.l}><CardContent className="pt-5"><p className="text-xl font-bold">{m.v}</p><p className="text-xs text-muted-foreground">{m.l}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Utilisateurs ({cabUsers.length})</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {cabUsers.length === 0 ? <p className="text-sm text-muted-foreground">Aucun.</p> :
            cabUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 text-sm">
                <span>{u.name} <span className="text-muted-foreground">· {u.email}</span></span>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{u.role}</Badge>
                  <form action={impersonateAction}>
                    <input type="hidden" name="email" value={u.email} />
                    <input type="hidden" name="cabinetId" value={cab.id} />
                    <Button type="submit" size="xs" variant="outline">Se connecter en tant que</Button>
                  </form>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Modifier</CardTitle></CardHeader>
        <CardContent>
          <EditCabinetForm cabinet={{ id: cab.id, name: cab.name, displayName: cab.displayName, plan: cab.plan, primaryColor: cab.primaryColor, logoUrl: cab.logoUrl, emailFrom: cab.emailFrom }} />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="text-sm text-destructive">Zone dangereuse</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Supprime définitivement le cabinet, toutes ses données et tous les comptes de ses utilisateurs. Irréversible.</p>
          <DeleteCabinetForm id={cab.id} slug={cab.slug} />
        </CardContent>
      </Card>
    </div>
  );
}
