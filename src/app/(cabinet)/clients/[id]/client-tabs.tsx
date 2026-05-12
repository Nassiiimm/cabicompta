"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  CalendarClock,
  FileText,
  Receipt,
  Clock,
  ShieldCheck,
  LayoutDashboard,
  Upload,
  ChevronDown,
  ChevronRight,
  GitBranch,
} from "lucide-react";
import { DeleteClientButton } from "./delete-button";
import { RequestDocsButton } from "./request-docs-button";
import { GenerateDeadlinesButton } from "./generate-deadlines-button";
import { InviteClientButton } from "./invite-client";
import { AssignStaff } from "./assign-staff";
import { TimeTracker } from "./time-tracker";
import { KycSection } from "./kyc-section";
import { DeadlineAction } from "./deadline-action";
import { DocumentComments } from "@/components/cabinet/document-comments";
import { WorkflowTab } from "./workflow-tab";

const TABS = [
  { key: "apercu", label: "Aperçu", icon: LayoutDashboard },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "factures", label: "Factures", icon: Receipt },
  { key: "echeances", label: "Échéances", icon: CalendarClock },
  { key: "workflows", label: "Workflows", icon: GitBranch },
  { key: "temps", label: "Temps", icon: Clock },
  { key: "conformite", label: "Conformité", icon: ShieldCheck },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type Deadline = {
  id: string;
  label: string;
  type: string;
  period: string | null;
  dueDate: string;
  status: string;
};

type DocumentItem = {
  id: string;
  fileName: string;
  status: string;
  category: string | null;
  createdAt: string;
  uploaderName: string | null;
};

type InvoiceItem = {
  id: string;
  invoiceNumber: string;
  total: string;
  status: string;
  dueDate: string;
  createdAt: string;
};

interface ClientTabsProps {
  client: {
    id: string;
    name: string;
    status: string;
    neq: string | null;
    arcNumber: string | null;
    rqNumber: string | null;
    fiscalYearEnd: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
    assignedTo: string | null;
    kycVerified: boolean;
    conflictCheck: boolean;
    createdAt: string;
    updatedAt: string;
  };
  deadlines: Deadline[];
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

const DOC_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PROCESSED: "Traité",
  REJECTED: "Rejeté",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyée",
  PAID: "Payée",
  OVERDUE: "En retard",
  CANCELLED: "Annulée",
};

const INVOICE_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  SENT: "default",
  PAID: "secondary",
  OVERDUE: "destructive",
  CANCELLED: "outline",
};

export function ClientTabs({ client, deadlines }: ClientTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "apercu";
  const [activeTab, setActiveTab] = useState<TabKey>(
    TABS.some((t) => t.key === initialTab) ? initialTab : "apercu"
  );

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }

  // Compute summary stats for apercu
  const keyDeadlines = deadlines.filter(
    (d) => !["INSTALMENT", "DAS"].includes(d.type)
  );
  const upcomingDeadlines = deadlines.filter((d) => d.status === "UPCOMING");
  const nextDeadline = upcomingDeadlines.length > 0
    ? upcomingDeadlines.reduce((min, d) =>
        new Date(d.dueDate) < new Date(min.dueDate) ? d : min
      )
    : null;
  const nextDeadlineDays = nextDeadline
    ? Math.ceil((new Date(nextDeadline.dueDate).getTime() - Date.now()) / 86400000)
    : null;

  const formatDate = (date: string | null) => {
    if (!date) return "\u2014";
    return new Date(date).toLocaleDateString("fr-CA");
  };

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="border-b flex gap-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "apercu" && (
        <ApercuTab
          client={client}
          deadlines={deadlines}
          nextDeadlineDays={nextDeadlineDays}
          formatDate={formatDate}
        />
      )}
      {activeTab === "documents" && <DocumentsTab companyId={client.id} />}
      {activeTab === "factures" && <FacturesTab companyId={client.id} />}
      {activeTab === "echeances" && (
        <EcheancesTab
          companyId={client.id}
          deadlines={deadlines}
          keyDeadlines={keyDeadlines}
        />
      )}
      {activeTab === "workflows" && <WorkflowTab companyId={client.id} />}
      {activeTab === "temps" && <TempsTab companyId={client.id} />}
      {activeTab === "conformite" && (
        <ConformiteTab
          companyId={client.id}
          kycVerified={client.kycVerified}
          conflictCheck={client.conflictCheck}
        />
      )}
    </div>
  );
}

// ─── Apercu Tab ────────────────────────────────────────────
function ApercuTab({
  client,
  deadlines,
  nextDeadlineDays,
  formatDate,
}: {
  client: ClientTabsProps["client"];
  deadlines: Deadline[];
  nextDeadlineDays: number | null;
  formatDate: (d: string | null) => string;
}) {
  const [docCount, setDocCount] = useState<{ total: number; pending: number } | null>(null);
  const [invoiceCount, setInvoiceCount] = useState<{ total: number; unpaid: number } | null>(null);

  useEffect(() => {
    fetch(`/api/documents?companyId=${client.id}&limit=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setDocCount({
            total: data.total ?? data.documents?.length ?? 0,
            pending: data.documents?.filter((d: { status: string }) => d.status === "PENDING").length ?? 0,
          });
        }
      })
      .catch(() => {});
    fetch(`/api/invoices?companyId=${client.id}&limit=200`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const invs = data.invoices ?? [];
          setInvoiceCount({
            total: data.total ?? invs.length,
            unpaid: invs.filter((i: { status: string }) => i.status === "SENT" || i.status === "OVERDUE").length,
          });
        }
      })
      .catch(() => {});
  }, [client.id]);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Documents</span>
          </div>
          {docCount ? (
            <p className="text-lg font-bold">
              {docCount.total}
              {docCount.pending > 0 && (
                <span className="text-sm font-normal text-amber-600 ml-2">
                  ({docCount.pending} en attente)
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          )}
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Factures</span>
          </div>
          {invoiceCount ? (
            <p className="text-lg font-bold">
              {invoiceCount.total}
              {invoiceCount.unpaid > 0 && (
                <span className="text-sm font-normal text-red-600 ml-2">
                  ({invoiceCount.unpaid} impayée{invoiceCount.unpaid > 1 ? "s" : ""})
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          )}
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Prochaine échéance</span>
          </div>
          {nextDeadlineDays !== null ? (
            <p className={`text-lg font-bold ${nextDeadlineDays <= 7 ? "text-red-600" : nextDeadlineDays <= 14 ? "text-amber-600" : ""}`}>
              {nextDeadlineDays <= 0 ? "Aujourd'hui" : `${nextDeadlineDays}j`}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune</p>
          )}
        </div>
      </div>

      {/* Company info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Nom" value={client.name} />
            <InfoRow label="NEQ" value={client.neq} />
            <InfoRow label="Numéro ARC" value={client.arcNumber} />
            <InfoRow label="Numéro RQ" value={client.rqNumber} />
            <InfoRow label="Fin d'exercice fiscal" value={formatDate(client.fiscalYearEnd)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Adresse" value={client.address} />
            <InfoRow label="Ville" value={client.city} />
            <InfoRow label="Province" value={client.province} />
            <InfoRow label="Code postal" value={client.postalCode} />
            <InfoRow label="Téléphone" value={client.phone} />
            <InfoRow label="Courriel" value={client.email} />
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
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

      {/* Assignment */}
      <AssignStaff companyId={client.id} currentAssignedTo={client.assignedTo} />

      {/* Actions */}
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

      <div className="text-xs text-muted-foreground">
        Créé le {formatDate(client.createdAt)} — Modifié le {formatDate(client.updatedAt)}
      </div>
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────
function DocumentsTab({ companyId }: { companyId: string }) {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/documents?companyId=${companyId}`)
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((data) => setDocs(data.documents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Chargement des documents...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Documents ({docs.length})
        </h2>
        <Link
          href={`/documents?companyId=${companyId}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Upload className="size-3.5 mr-1.5" />
          Téléverser
        </Link>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <FileText className="size-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucun document pour ce client.</p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {docs.map((doc) => (
            <div key={doc.id}>
              <button
                onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.uploaderName ?? "—"} · {new Date(doc.createdAt).toLocaleDateString("fr-CA")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Badge
                    variant={doc.status === "PROCESSED" ? "secondary" : doc.status === "REJECTED" ? "destructive" : "outline"}
                  >
                    {DOC_STATUS_LABELS[doc.status] ?? doc.status}
                  </Badge>
                  {expandedId === doc.id ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </div>
              </button>
              {expandedId === doc.id && (
                <div className="px-4 pb-4 border-t bg-muted/10">
                  <div className="pt-3">
                    <DocumentComments documentId={doc.id} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Factures Tab ────────────────────────────────────────────
function FacturesTab({ companyId }: { companyId: string }) {
  const [invoicesList, setInvoicesList] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invoices?companyId=${companyId}`)
      .then((r) => (r.ok ? r.json() : { invoices: [] }))
      .then((data) => setInvoicesList(data.invoices ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Chargement des factures...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Factures ({invoicesList.length})
        </h2>
        <Link
          href={`/invoices/new?companyId=${companyId}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Receipt className="size-3.5 mr-1.5" />
          Nouvelle facture
        </Link>
      </div>

      {invoicesList.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <Receipt className="size-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucune facture pour ce client.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium px-4 py-2">Numéro</th>
                <th className="text-left font-medium px-4 py-2">Date</th>
                <th className="text-right font-medium px-4 py-2">Montant</th>
                <th className="text-left font-medium px-4 py-2">Statut</th>
                <th className="text-left font-medium px-4 py-2">Échéance</th>
              </tr>
            </thead>
            <tbody>
              {invoicesList.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(inv.createdAt).toLocaleDateString("fr-CA")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    {Number(inv.total).toLocaleString("fr-CA", {
                      style: "currency",
                      currency: "CAD",
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={INVOICE_STATUS_VARIANTS[inv.status] ?? "outline"}>
                      {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(inv.dueDate).toLocaleDateString("fr-CA")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Echeances Tab ────────────────────────────────────────────
function EcheancesTab({
  companyId,
  deadlines,
  keyDeadlines,
}: {
  companyId: string;
  deadlines: Deadline[];
  keyDeadlines: Deadline[];
}) {
  const otherCount = deadlines.length - keyDeadlines.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Échéances fiscales ({deadlines.length})
        </h2>
        <GenerateDeadlinesButton companyId={companyId} />
      </div>

      {deadlines.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <CalendarClock className="size-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Aucune échéance. Cliquez sur &quot;Générer les échéances&quot; pour créer le calendrier fiscal.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
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
                      {d.period ?? "\u2014"}
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
          {otherCount > 0 && (
            <p className="text-xs text-muted-foreground px-4 py-3 border-t">
              + {otherCount} échéance{otherCount > 1 ? "s" : ""} mensuelles (acomptes provisionnels, DAS)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Temps Tab ────────────────────────────────────────────
function TempsTab({ companyId }: { companyId: string }) {
  return <TimeTracker companyId={companyId} />;
}

// ─── Conformite Tab ────────────────────────────────────────────
function ConformiteTab({
  companyId,
  kycVerified,
  conflictCheck,
}: {
  companyId: string;
  kycVerified: boolean;
  conflictCheck: boolean;
}) {
  return <KycSection companyId={companyId} kycVerified={kycVerified} conflictCheck={conflictCheck} />;
}

// ─── Shared ────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "\u2014"}</span>
    </div>
  );
}
