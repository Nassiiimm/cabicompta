import Link from "next/link";
import { db } from "@/lib/db";
import { cabinets, users, companies, platformAuditLogs } from "@/lib/db/schema";
import { count, eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PlatformOverview() {
  const [[tot], [active], [usr], [comp], recent, recentAudit] = await Promise.all([
    db.select({ v: count() }).from(cabinets),
    db.select({ v: count() }).from(cabinets).where(eq(cabinets.status, "ACTIVE")),
    db.select({ v: count() }).from(users),
    db.select({ v: count() }).from(companies),
    db.select({ id: cabinets.id, name: cabinets.name, slug: cabinets.slug, createdAt: cabinets.createdAt })
      .from(cabinets).orderBy(desc(cabinets.createdAt)).limit(5),
    db.select({ action: platformAuditLogs.action, actorEmail: platformAuditLogs.actorEmail, createdAt: platformAuditLogs.createdAt })
      .from(platformAuditLogs).orderBy(desc(platformAuditLogs.createdAt)).limit(5),
  ]);

  const metrics = [
    { label: "Cabinets", value: tot?.v ?? 0, href: "/platform/cabinets" },
    { label: "Actifs", value: active?.v ?? 0 },
    { label: "Suspendus", value: (tot?.v ?? 0) - (active?.v ?? 0) },
    { label: "Utilisateurs (tous)", value: usr?.v ?? 0 },
    { label: "Sociétés (toutes)", value: comp?.v ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Vue d&apos;ensemble</h1>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {metrics.map((m) => {
          const inner = (
            <Card><CardContent className="pt-5">
              <p className="text-2xl font-bold tracking-tight">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </CardContent></Card>
          );
          return m.href ? <Link key={m.label} href={m.href}>{inner}</Link> : <div key={m.label}>{inner}</div>;
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Cabinets récents</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {recent.length === 0 ? <p className="text-sm text-muted-foreground">Aucun.</p> :
              recent.map((c) => (
                <Link key={c.id} href={`/platform/cabinets/${c.id}`} className="flex justify-between py-2 text-sm hover:opacity-70">
                  <span className="font-medium">{c.name} <span className="text-muted-foreground font-normal">/{c.slug}</span></span>
                  <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("fr-CA")}</span>
                </Link>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Activité plateforme récente</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {recentAudit.length === 0 ? <p className="text-sm text-muted-foreground">Aucune action.</p> :
              recentAudit.map((a, i) => (
                <div key={i} className="flex justify-between py-2 text-sm">
                  <span><span className="font-mono text-xs">{a.action}</span> <span className="text-muted-foreground">· {a.actorEmail}</span></span>
                  <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString("fr-CA")}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
