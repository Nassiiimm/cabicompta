import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { companies, fiscalDeadlines } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { ClientTabs } from "./client-tabs";
import { Suspense } from "react";

const statusLabels: Record<string, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  ARCHIVED: "Archive",
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  ARCHIVED: "destructive",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [client] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);

  if (!client) {
    notFound();
  }

  // Fetch deadlines server-side and pass as serializable data
  const deadlines = await db
    .select()
    .from(fiscalDeadlines)
    .where(eq(fiscalDeadlines.companyId, id))
    .orderBy(fiscalDeadlines.dueDate)
    .limit(50);

  // Serialize for client component
  const serializedClient = {
    id: client.id,
    name: client.name,
    status: client.status,
    neq: client.neq,
    arcNumber: client.arcNumber,
    rqNumber: client.rqNumber,
    fiscalYearEnd: client.fiscalYearEnd,
    address: client.address,
    city: client.city,
    province: client.province,
    postalCode: client.postalCode,
    phone: client.phone,
    email: client.email,
    notes: client.notes,
    assignedTo: client.assignedTo,
    kycVerified: client.kycVerified,
    conflictCheck: client.conflictCheck,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };

  const serializedDeadlines = deadlines.map((d) => ({
    id: d.id,
    label: d.label,
    type: d.type,
    period: d.period,
    dueDate: typeof d.dueDate === "string" ? d.dueDate : new Date(d.dueDate).toISOString(),
    status: d.status,
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link
          href="/clients"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {client.name}
            </h1>
            <Badge variant={statusVariants[client.status] || "secondary"}>
              {statusLabels[client.status] || client.status}
            </Badge>
          </div>
          {client.neq && (
            <p className="text-muted-foreground mt-1">NEQ: {client.neq}</p>
          )}
        </div>
      </div>

      <Suspense fallback={<div className="text-sm text-muted-foreground py-8 text-center">Chargement...</div>}>
        <ClientTabs client={serializedClient} deadlines={serializedDeadlines} />
      </Suspense>
    </div>
  );
}
