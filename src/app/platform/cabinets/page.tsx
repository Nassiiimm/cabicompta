import Link from "next/link";
import { db } from "@/lib/db";
import { cabinets, users, companies } from "@/lib/db/schema";
import { count, desc, ilike, or } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreateCabinetForm } from "../create-cabinet-form";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function CabinetsPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const where = q ? or(ilike(cabinets.name, `%${q}%`), ilike(cabinets.slug, `%${q}%`)) : undefined;

  const [list, [totalRow], userCounts, companyCounts] = await Promise.all([
    db.select({ id: cabinets.id, slug: cabinets.slug, name: cabinets.name, status: cabinets.status, plan: cabinets.plan, createdAt: cabinets.createdAt })
      .from(cabinets).where(where).orderBy(desc(cabinets.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ v: count() }).from(cabinets).where(where),
    db.select({ cabinetId: users.cabinetId, n: count() }).from(users).groupBy(users.cabinetId),
    db.select({ cabinetId: companies.cabinetId, n: count() }).from(companies).groupBy(companies.cabinetId),
  ]);
  const total = totalRow?.v ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const uMap = new Map(userCounts.map((r) => [r.cabinetId, r.n]));
  const cMap = new Map(companyCounts.map((r) => [r.cabinetId, r.n]));

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Cabinets ({total})</h1>

      <Card>
        <CardHeader><CardTitle className="text-sm">Liste</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form className="flex gap-2">
            <Input name="q" defaultValue={q ?? ""} placeholder="Rechercher par nom ou slug…" className="h-8 text-sm max-w-xs" />
            <Button type="submit" size="sm" variant="outline">Rechercher</Button>
          </form>

          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun cabinet.</p>
          ) : (
            <div className="rounded-lg border divide-y">
              {list.map((c) => (
                <Link key={c.id} href={`/platform/cabinets/${c.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name} <span className="text-muted-foreground font-normal">/{c.slug}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {uMap.get(c.id) ?? 0} utilisateurs · {cMap.get(c.id) ?? 0} sociétés · {c.plan} · {new Date(c.createdAt).toLocaleDateString("fr-CA")}
                    </p>
                  </div>
                  <Badge variant={c.status === "ACTIVE" ? "default" : "destructive"}>
                    {c.status === "ACTIVE" ? "Actif" : "Suspendu"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Page {page} / {pages}</span>
              <div className="flex gap-2">
                {page > 1 && <Link href={`/platform/cabinets?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`} className="underline">Précédent</Link>}
                {page < pages && <Link href={`/platform/cabinets?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`} className="underline">Suivant</Link>}
              </div>
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
