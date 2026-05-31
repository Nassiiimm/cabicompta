import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { asc, desc, isNull, ilike, or, and, eq } from "drizzle-orm";
import { Plus, Building2 } from "lucide-react";
import { ClientSearch } from "./client-search";
import { ClientFilters } from "./client-filters";
import { ClientSort } from "./client-sort";
import { Suspense } from "react";
import { ExportButton } from "@/components/cabinet/export-button";
import { getTranslations } from "next-intl/server";

const TYPE_LABELS: Record<string, string> = {
  T1_PARTICULIER: "T1 — Particulier",
  T1_AUTONOME:    "T1 — Autonome",
  T2_SOCIETE:     "T2 — Société",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string; sort?: string; dir?: string }>;
}) {
  await requireStaff();
  const t = await getTranslations("clients");
  const { q, status, type, sort, dir } = await searchParams;

  const statusLabels: Record<string, string> = {
    ACTIVE: t("active"),
    INACTIVE: t("inactive"),
    ARCHIVED: t("archived"),
  };

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    ACTIVE: "default",
    INACTIVE: "secondary",
    ARCHIVED: "destructive",
  };

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

  const VALID_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
  if (status && VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    filters.push(eq(companies.status, status as typeof VALID_STATUSES[number]));
  }

  const VALID_TYPES = ["T1_PARTICULIER", "T1_AUTONOME", "T2_SOCIETE"] as const;
  if (type && VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    filters.push(eq(companies.type, type as typeof VALID_TYPES[number]));
  }

  const conditions = and(...filters);

  const SORT_COLS = {
    name: companies.name,
    status: companies.status,
    type: companies.type,
    createdAt: companies.createdAt,
  } as const;
  type SortKey = keyof typeof SORT_COLS;
  const sortKey: SortKey = (sort as SortKey) in SORT_COLS ? (sort as SortKey) : "name";
  const sortCol = SORT_COLS[sortKey];
  const orderFn = dir === "desc" ? desc : asc;

  const clientList = await db
    .select()
    .from(companies)
    .where(conditions)
    .orderBy(orderFn(sortCol));

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <ExportButton href="/api/export/clients" />
          <Link href="/clients/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-3.5 mr-1" />
            {t("new")}
          </Link>
        </div>
      </div>

      <ClientFilters currentStatus={status} currentType={type} />
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <ClientSearch defaultValue={q} />
        </div>
      </div>
      <Suspense fallback={null}>
        <ClientSort currentSort={sort} currentDir={dir} />
      </Suspense>

      {clientList.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Building2 className="size-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {q ? t("noClientsSearch", { q }) : t("noClients")}
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
                  {[
                    client.type ? TYPE_LABELS[client.type] : null,
                    client.neq ? `NEQ ${client.neq}` : null,
                    client.email,
                  ].filter(Boolean).join(" · ") || "—"}
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
