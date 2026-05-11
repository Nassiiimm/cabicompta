import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { asc, isNull, ilike, or, and, eq } from "drizzle-orm";
import { Plus, Building2 } from "lucide-react";
import { ClientSearch } from "./client-search";
import { ClientFilters } from "./client-filters";
import { ExportButton } from "@/components/cabinet/export-button";

const statusLabels: Record<string, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  ARCHIVED: "Archivé",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  ARCHIVED: "destructive",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;

  const filters = [isNull(companies.deletedAt)];

  if (q) {
    filters.push(
      or(
        ilike(companies.name, `%${q}%`),
        ilike(companies.neq, `%${q}%`),
        ilike(companies.email, `%${q}%`)
      )!
    );
  }

  if (status === "ACTIVE" || status === "INACTIVE") {
    filters.push(eq(companies.status, status));
  }

  const conditions = and(...filters);

  const clientList = await db
    .select()
    .from(companies)
    .where(conditions)
    .orderBy(asc(companies.name));

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Clients</h1>
        <div className="flex items-center gap-2">
          <ExportButton href="/api/export/clients" />
          <Link href="/clients/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-3.5 mr-1" />
            Nouveau
          </Link>
        </div>
      </div>

      <ClientFilters currentStatus={status} />
      <ClientSearch defaultValue={q} />

      {clientList.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Building2 className="size-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {q ? `Aucun résultat pour "${q}"` : "Aucun client"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {clientList.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{client.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[client.neq ? `NEQ ${client.neq}` : null, client.email].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <Badge variant={statusVariants[client.status] ?? "secondary"}>
                {statusLabels[client.status] ?? client.status}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
