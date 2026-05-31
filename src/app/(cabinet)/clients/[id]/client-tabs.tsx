"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { UserRole } from "@/types";
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
  Clock,
  ShieldCheck,
  LayoutDashboard,
  Upload,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Eye,
  EyeOff,
  Lock,
  Check,
  X,
  MessageSquare,
  Zap,
} from "lucide-react";
import { DeleteClientButton } from "./delete-button";
import { RequestDocsButton } from "./request-docs-button";
import { InviteClientButton } from "./invite-client";
import { AssignStaff } from "./assign-staff";
import { TimeTracker } from "./time-tracker";
import { KycSection } from "./kyc-section";
import { DeadlineAction } from "./deadline-action";
import { DocumentComments } from "@/components/cabinet/document-comments";
import { WorkflowTab } from "./workflow-tab";
import { CATEGORY_LABELS, VALID_CATEGORIES, SUBCATEGORIES_BY_CATEGORY } from "@/lib/document-categories";

const TYPE_LABELS: Record<string, string> = {
  T1_PARTICULIER: "T1 — Particulier",
  T1_AUTONOME: "T1 — Travailleur autonome",
  T2_SOCIETE: "T2 — Société",
};

const TABS = [
  { key: "apercu", label: "Aperçu", icon: LayoutDashboard },
  { key: "documents", label: "Documents", icon: FileText },
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
  subcategory: string | null;
  createdAt: string;
  uploaderName: string | null;
};

interface ClientTabsProps {
  client: {
    id: string;
    name: string;
    status: string;
    type: string | null;
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
    bankName: string | null;
    bankTransitNumber: string | null;
    bankInstitutionNumber: string | null;
    bankAccountNumber: string | null;
    bankOnlineId: string | null;
    bankPassword: string | null;
    clicsequrId: string | null;
    clicsequrPassword: string | null;
    arcId: string | null;
    arcPassword: string | null;
    cnesstId: string | null;
    cnesstPassword: string | null;
    reqId: string | null;
    reqPassword: string | null;
    serviceCanadaId: string | null;
    serviceCanadaPassword: string | null;
    gstFiling: string | null;
    hasEmployees: boolean;
    employeeCount: number | null;
    hasInstallments: boolean;
  };
  deadlines: Deadline[];
  userRole: UserRole;
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


export function ClientTabs({ client, deadlines, userRole }: ClientTabsProps) {
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
          userRole={userRole}
        />
      )}
      {activeTab === "documents" && <DocumentsTab companyId={client.id} />}
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
  userRole,
}: {
  client: ClientTabsProps["client"];
  deadlines: Deadline[];
  nextDeadlineDays: number | null;
  formatDate: (d: string | null) => string;
  userRole: UserRole;
}) {
  const [docCount, setDocCount] = useState<{ total: number; pending: number } | null>(null);

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
            <InfoRow label="Type" value={client.type ? (TYPE_LABELS[client.type] ?? client.type) : null} />
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

      {/* Informations bancaires — ADMIN/STAFF uniquement */}
      {(userRole === "ADMIN" || userRole === "STAFF") && (
        <BankingCard client={client} />
      )}

      {/* Portails gouvernementaux — ADMIN/STAFF uniquement */}
      {(userRole === "ADMIN" || userRole === "STAFF") && (
        <GouvPortalsCard client={client} />
      )}

      {/* Profil fiscal — Pilote automatique */}
      {(userRole === "ADMIN" || userRole === "STAFF") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="size-4 text-muted-foreground" />
              Profil fiscal — Pilote automatique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="Déclaration TPS/TVQ"
              value={
                client.gstFiling === "MONTHLY" ? "Mensuelle" :
                client.gstFiling === "QUARTERLY" ? "Trimestrielle" :
                client.gstFiling === "ANNUAL" ? "Annuelle" :
                client.gstFiling === "NONE" ? "Non inscrit" : null
              }
            />
            <InfoRow label="Employés" value={client.hasEmployees ? (client.employeeCount != null ? `Oui (${client.employeeCount})` : "Oui") : "Non"} />
            <InfoRow label="Acomptes provisionnels" value={client.hasInstallments ? "Oui" : "Non"} />
            <div className="pt-1">
              <Link
                href={`/autopilot`}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Zap className="size-3" />
                Gérer dans le Pilote automatique
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <InviteClientButton companyId={client.id} />
          <RequestDocsButton companyId={client.id} companyName={client.name} />
          <Link
            href={`/messages?company=${client.id}&name=${encodeURIComponent(client.name)}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Link>
          <Link
            href={`/clients/${client.id}/edit`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Link>
        </div>
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
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ category: string; subcategory: string }>({ category: "", subcategory: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch(`/api/documents?companyId=${companyId}`)
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((data) => setDocs(data.documents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  function startEdit(doc: DocumentItem) {
    setEditingId(doc.id);
    setEditForm({ category: doc.category ?? "OTHER", subcategory: doc.subcategory ?? "" });
    setExpandedId(null);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: editForm.category, subcategory: editForm.subcategory || null }),
      });
      setEditingId(null);
      // Refresh docs list
      fetch(`/api/documents?companyId=${companyId}`)
        .then((r) => (r.ok ? r.json() : { documents: [] }))
        .then((data) => setDocs(data.documents ?? []))
        .catch(() => {});
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Chargement des documents...</p>;
  }

  return (
    <>
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
              <div className="flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors">
                <button
                  onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-sm font-medium truncate">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.uploaderName ?? "—"} · {new Date(doc.createdAt).toLocaleDateString("fr-CA")}
                  </p>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.category && (
                    <Badge variant="secondary" className="text-[10px]">
                      {CATEGORY_LABELS[doc.category] ?? doc.category}
                      {doc.subcategory ? ` · ${doc.subcategory}` : ""}
                    </Badge>
                  )}
                  <Badge
                    variant={doc.status === "PROCESSED" ? "secondary" : doc.status === "REJECTED" ? "destructive" : "outline"}
                    className="text-[10px]"
                  >
                    {DOC_STATUS_LABELS[doc.status] ?? doc.status}
                  </Badge>
                  <button
                    onClick={() => startEdit(doc)}
                    title="Modifier catégorie"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    onClick={() => window.open(`/api/documents/${doc.id}/view`, "_blank")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Voir
                  </button>
                  <button onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}>
                    {expandedId === doc.id ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Edit panel */}
              {editingId === doc.id && (
                <div className="px-4 pb-3 pt-2 border-t bg-muted/10 flex flex-wrap items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Type</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ category: e.target.value, subcategory: "" })}
                      className="h-7 rounded border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring"
                    >
                      {VALID_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Sous-catégorie</label>
                    <select
                      value={editForm.subcategory}
                      onChange={(e) => setEditForm((f) => ({ ...f, subcategory: e.target.value }))}
                      className="h-7 rounded border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring"
                    >
                      <option value="">— Aucune —</option>
                      {(SUBCATEGORIES_BY_CATEGORY[editForm.category] ?? []).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => saveEdit(doc.id)}
                    disabled={saving}
                    className="h-7 px-2 rounded border border-input bg-background text-xs hover:bg-muted transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <Check className="size-3" />
                    {saving ? "..." : "OK"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="h-7 px-2 rounded border border-input bg-background text-xs hover:bg-muted transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}

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
    </>
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
        <Link
          href="/autopilot"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <Zap className="size-3" />
          Pilote automatique
        </Link>
      </div>

      {deadlines.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <CalendarClock className="size-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Aucune échéance. Utilisez le{" "}
            <Link href="/autopilot" className="underline hover:text-foreground">Pilote automatique</Link>
            {" "}pour générer le calendrier fiscal.
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

// ─── Banking Card ────────────────────────────────────────────
function BankingCard({ client }: { client: ClientTabsProps["client"] }) {
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    bankName: client.bankName ?? "",
    bankTransitNumber: client.bankTransitNumber ?? "",
    bankInstitutionNumber: client.bankInstitutionNumber ?? "",
    bankAccountNumber: client.bankAccountNumber ?? "",
    bankOnlineId: client.bankOnlineId ?? "",
    bankPassword: client.bankPassword ?? "",
  });
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-4 text-muted-foreground" />
          Informations bancaires
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <BankField label="Banque" value={form.bankName} onChange={(v) => setForm((f) => ({ ...f, bankName: v }))} />
          <BankField label="N° de transit (5 chiffres)" value={form.bankTransitNumber} onChange={(v) => setForm((f) => ({ ...f, bankTransitNumber: v }))} />
          <BankField label="N° d'institution (3 chiffres)" value={form.bankInstitutionNumber} onChange={(v) => setForm((f) => ({ ...f, bankInstitutionNumber: v }))} />
          <BankField label="N° de compte" value={form.bankAccountNumber} onChange={(v) => setForm((f) => ({ ...f, bankAccountNumber: v }))} />
          <BankField label="Identifiant bancaire en ligne" value={form.bankOnlineId} onChange={(v) => setForm((f) => ({ ...f, bankOnlineId: v }))} />
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Mot de passe bancaire</label>
            <div className="flex items-center gap-1">
              <input
                type={showPassword ? "text" : "password"}
                value={form.bankPassword}
                onChange={(e) => setForm((f) => ({ ...f, bankPassword: e.target.value }))}
                className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-8 px-3 rounded-md border border-input bg-transparent text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : saved ? "Enregistré ✓" : "Enregistrer"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Gouvernement Portails Card ───────────────────────────────
const GOUV_PORTALS = [
  { key: "clicsequr", label: "Revenu QC – Clic Séqur Entreprise" },
  { key: "arc",       label: "ARC (Agence du revenu du Canada)" },
  { key: "cnesst",    label: "CNESST" },
  { key: "req",       label: "REQ (Registraire des entreprises)" },
  { key: "serviceCanada", label: "Service Canada" },
] as const;

type PortalKey = typeof GOUV_PORTALS[number]["key"];

function GouvPortalsCard({ client }: { client: ClientTabsProps["client"] }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    clicsequrId: client.clicsequrId ?? "",
    clicsequrPassword: client.clicsequrPassword ?? "",
    arcId: client.arcId ?? "",
    arcPassword: client.arcPassword ?? "",
    cnesstId: client.cnesstId ?? "",
    cnesstPassword: client.cnesstPassword ?? "",
    reqId: client.reqId ?? "",
    reqPassword: client.reqPassword ?? "",
    serviceCanadaId: client.serviceCanadaId ?? "",
    serviceCanadaPassword: client.serviceCanadaPassword ?? "",
  });

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function toggleShow(key: string) {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-4 text-muted-foreground" />
          Portails gouvernementaux
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {GOUV_PORTALS.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <BankField
                label="Identifiant"
                value={form[`${key}Id` as keyof typeof form]}
                onChange={(v) => setForm((f) => ({ ...f, [`${key}Id`]: v }))}
              />
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Mot de passe</label>
                <div className="flex items-center gap-1">
                  <input
                    type={showPasswords[key] ? "text" : "password"}
                    value={form[`${key}Password` as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [`${key}Password`]: e.target.value }))}
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <button type="button" onClick={() => toggleShow(key)} className="shrink-0 text-muted-foreground hover:text-foreground">
                    {showPasswords[key] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-8 px-3 rounded-md border border-input bg-transparent text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : saved ? "Enregistré ✓" : "Enregistrer"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function BankField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
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
