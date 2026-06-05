import { db } from "@/lib/db";
import { platformAdmins } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPlatformAdmin } from "@/lib/platform";
import { setPlatformAdminActiveAction } from "../actions";
import { AddPlatformAdminForm } from "./add-platform-admin-form";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const me = await getPlatformAdmin();
  const list = await db
    .select({ id: platformAdmins.id, email: platformAdmins.email, name: platformAdmins.name, active: platformAdmins.active, createdAt: platformAdmins.createdAt })
    .from(platformAdmins).orderBy(desc(platformAdmins.createdAt));

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Super-admins plateforme ({list.length})</h1>

      <Card>
        <CardHeader><CardTitle className="text-sm">Comptes</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {list.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="font-medium">{a.name}</span> <span className="text-muted-foreground">· {a.email}</span>
                {a.id === me?.id && <span className="text-xs text-muted-foreground"> (vous)</span>}
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={a.active ? "default" : "destructive"}>{a.active ? "Actif" : "Désactivé"}</Badge>
                {a.id !== me?.id && (
                  <form action={setPlatformAdminActiveAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="active" value={a.active ? "false" : "true"} />
                    <Button type="submit" size="xs" variant="outline">{a.active ? "Désactiver" : "Réactiver"}</Button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Ajouter un super-admin</CardTitle></CardHeader>
        <CardContent><AddPlatformAdminForm /></CardContent>
      </Card>
    </div>
  );
}
