import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { companies, fiscalDeadlines } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ArrowLeft, Pencil, CalendarClock } from "lucide-react";
import { DeleteClientButton } from "./delete-button";
import { RequestDocsButton } from "./request-docs-button";
import { GenerateDeadlinesButton } from "./generate-deadlines-button";
import { InviteClientButton } from "./invite-client";
import { AssignStaff } from "./assign-staff";
import { TimeTracker } from "./time-tracker";
import { KycSection } from "./kyc-section";
import { DeadlineAction } from "./deadline-action";

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

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-CA");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-2 flex-wrap">
          <InviteClientButton companyId={client.id} />
          <GenerateDeadlinesButton companyId={client.id} />
          <RequestDocsButton companyId={client.id} companyName={client.name} />
          <Link
            href={`/clients/${client.id}/edit`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Link>
          <DeleteClientButton clientId={client.id} clientName={client.name} />
        </div>
      </div>

      {/* Assignment */}
      <AssignStaff companyId={client.id} currentAssignedTo={client.assignedTo} />

      {/* Time tracking */}
      <TimeTracker companyId={client.id} />

      {/* KYC / Conformité */}
      <KycSection companyId={client.id} kycVerified={client.kycVerified} conflictCheck={client.conflictCheck} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations generales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Nom" value={client.name} />
            <InfoRow label="NEQ" value={client.neq} />
            <InfoRow label="Numero ARC" value={client.arcNumber} />
            <InfoRow label="Numero RQ" value={client.rqNumber} />
            <InfoRow
              label="Fin d'exercice fiscal"
              value={formatDate(client.fiscalYearEnd)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coordonnees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Adresse" value={client.address} />
            <InfoRow label="Ville" value={client.city} />
            <InfoRow label="Province" value={client.province} />
            <InfoRow label="Code postal" value={client.postalCode} />
            <InfoRow label="Telephone" value={client.phone} />
            <InfoRow label="Courriel" value={client.email} />
          </CardContent>
        </Card>
      </div>

      {/* Fiscal Deadlines */}
      <FiscalDeadlinesSection companyId={client.id} />

      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {client.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground">
        Cree le {client.createdAt.toLocaleDateString("fr-CA")} — Modifie le{" "}
        {client.updatedAt.toLocaleDateString("fr-CA")}
      </div>
    </div>
  );
}

const DEADLINE_STATUS_LABELS: Record<string, string> = {
  UPCOMING: "À venir",
  IN_PROGRESS: "En cours",
  FILED: "Produit",
  OVERDUE: "En retard",
};

const DEADLINE_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  UPCOMING: "outline",
  IN_PROGRESS: "default",
  FILED: "secondary",
  OVERDUE: "destructive",
};

async function FiscalDeadlinesSection({ companyId }: { companyId: string }) {
  const deadlines = await db
    .select()
    .from(fiscalDeadlines)
    .where(eq(fiscalDeadlines.companyId, companyId))
    .orderBy(fiscalDeadlines.dueDate)
    .limit(20);

  // Group by important types (exclude monthly instalments and DAS by default)
  const keyDeadlines = deadlines.filter(
    (d) => !["INSTALMENT", "DAS"].includes(d.type)
  );
  const otherCount = deadlines.length - keyDeadlines.length;

  if (deadlines.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Échéances fiscales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune échéance. Cliquez sur &quot;Générer les échéances&quot; pour créer le calendrier fiscal.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Échéances fiscales ({deadlines.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium px-4 py-2">Échéance</th>
                <th className="text-left font-medium px-4 py-2">Période</th>
                <th className="text-left font-medium px-4 py-2">Date limite</th>
                <th className="text-left font-medium px-4 py-2">Statut</th>
                <th className="text-left font-medium px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {keyDeadlines.map((d) => {
                const dueDate = new Date(d.dueDate);
                const today = new Date();
                const daysLeft = Math.ceil(
                  (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{d.label}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {d.period ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={daysLeft <= 7 && d.status === "UPCOMING" ? "text-destructive font-medium" : "text-muted-foreground"}>
                        {dueDate.toLocaleDateString("fr-CA", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      {d.status === "UPCOMING" && daysLeft > 0 && daysLeft <= 30 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({daysLeft}j)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={DEADLINE_STATUS_VARIANTS[d.status] ?? "outline"}>
                        {DEADLINE_STATUS_LABELS[d.status] ?? d.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <DeadlineAction deadlineId={d.id} status={d.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {otherCount > 0 && (
          <p className="text-xs text-muted-foreground px-4 py-3 border-t">
            + {otherCount} échéance{otherCount > 1 ? "s" : ""} mensuelles (acomptes provisionnels, DAS)
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}
