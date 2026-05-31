"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Building2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

type CompanyStatus = {
  id: string;
  name: string;
  type: string | null;
  autopilotActive: boolean;
  deadlines: { total: number; upcoming: number; inProgress: number; filed: number; overdue: number };
  workflows: { total: number; notStarted: number; inProgress: number; completed: number };
  pendingDocuments: number;
  risk: "HIGH" | "MEDIUM" | "LOW";
};

type Summary = {
  totalCompanies: number;
  autopilotActive: number;
  atRisk: number;
  pendingDocuments: number;
  totalWorkflows: number;
};

type DashboardData = {
  year: number;
  summary: Summary;
  companies: CompanyStatus[];
};

function RiskBadge({ risk }: { risk: "HIGH" | "MEDIUM" | "LOW" }) {
  if (risk === "HIGH")
    return <Badge variant="destructive" className="text-[10px]">⚠ À risque</Badge>;
  if (risk === "MEDIUM")
    return <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600">Attention</Badge>;
  return <Badge variant="secondary" className="text-[10px]">OK</Badge>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className={`size-9 rounded-lg flex items-center justify-center ${color ?? "bg-muted"}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function AutopilotDashboard() {
  const year = new Date().getFullYear();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "INACTIVE">("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/autopilot?year=${year}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  async function handleRun(companyIds?: string[]) {
    setRunning(true);
    try {
      const res = await fetch("/api/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, companyIds }),
      });
      if (res.ok) {
        const result = await res.json();
        toast.success(
          `Pilote lancé — ${result.workflowsCreated} workflows créés, ${result.deadlinesCreated} échéances`
        );
        await load();
      } else {
        toast.error("Erreur lors du lancement");
      }
    } finally {
      setRunning(false);
    }
  }

  const visibleCompanies = data?.companies.filter((c) => {
    if (filter === "ALL") return true;
    if (filter === "HIGH") return c.risk === "HIGH";
    if (filter === "MEDIUM") return c.risk === "MEDIUM";
    if (filter === "INACTIVE") return !c.autopilotActive;
    return true;
  }) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="size-5 text-emerald-500" />
            Pilote automatique fiscal {year}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Génère automatiquement les échéances, workflows et demandes documentaires pour tous vos clients.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading || running}
          >
            <RefreshCw className="size-3.5 mr-1.5" />
            Actualiser
          </Button>
          <Button
            size="sm"
            onClick={() => handleRun()}
            disabled={running}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {running ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Zap className="size-3.5 mr-1.5" />
            )}
            {running ? "Génération en cours..." : `Lancer pour tous les clients`}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            icon={Building2}
            label="Clients actifs"
            value={s.totalCompanies}
            color="bg-muted"
          />
          <StatCard
            icon={Zap}
            label="Pilote actif"
            value={s.autopilotActive}
            sub={`/ ${s.totalCompanies} clients`}
            color="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={AlertTriangle}
            label="À risque"
            value={s.atRisk}
            sub="Échéances en retard"
            color="bg-red-50 text-red-600"
          />
          <StatCard
            icon={FileText}
            label="Docs attendus"
            value={s.pendingDocuments}
            sub="Demandes en attente"
            color="bg-amber-50 text-amber-600"
          />
          <StatCard
            icon={TrendingUp}
            label="Workflows"
            value={s.totalWorkflows}
            sub={`pour ${year}`}
            color="bg-blue-50 text-blue-600"
          />
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["ALL", "HIGH", "MEDIUM", "INACTIVE"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
              filter === f
                ? "bg-foreground text-background border-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "ALL" && `Tous (${data?.companies.length ?? 0})`}
            {f === "HIGH" && `⚠ À risque (${data?.companies.filter((c) => c.risk === "HIGH").length ?? 0})`}
            {f === "MEDIUM" && `Attention (${data?.companies.filter((c) => c.risk === "MEDIUM").length ?? 0})`}
            {f === "INACTIVE" && `Non configuré (${data?.companies.filter((c) => !c.autopilotActive).length ?? 0})`}
          </button>
        ))}
      </div>

      {/* Tableau des clients */}
      <div className="rounded-xl border overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-2.5 border-b bg-muted/40">
          <span>Client</span>
          <span className="text-center px-4">Risque</span>
          <span className="text-center px-4">Échéances</span>
          <span className="text-center px-4">Workflows</span>
          <span className="text-center px-4">Docs attendus</span>
          <span className="text-center px-4">Action</span>
        </div>

        {visibleCompanies.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Aucun client dans cette catégorie.
          </div>
        )}

        <div className="divide-y">
          {visibleCompanies.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center px-4 py-3 hover:bg-muted/20 transition-colors"
            >
              {/* Nom */}
              <div>
                <Link
                  href={`/clients/${c.id}?tab=workflows`}
                  className="text-sm font-medium hover:underline"
                >
                  {c.name}
                </Link>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {c.type === "T2_SOCIETE"
                    ? "Société"
                    : c.type === "T1_AUTONOME"
                    ? "Travailleur autonome"
                    : c.type === "T1_PARTICULIER"
                    ? "Particulier"
                    : "—"}
                  {!c.autopilotActive && (
                    <span className="ml-2 text-amber-500">• Pilote non lancé</span>
                  )}
                </p>
              </div>

              {/* Risque */}
              <div className="text-center px-4">
                <RiskBadge risk={c.risk} />
              </div>

              {/* Échéances */}
              <div className="text-center px-4 text-sm">
                {c.deadlines.total > 0 ? (
                  <div className="space-y-0.5">
                    {c.deadlines.overdue > 0 && (
                      <p className="text-xs text-destructive font-medium">
                        {c.deadlines.overdue} en retard
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {c.deadlines.upcoming} à venir / {c.deadlines.filed} déposées
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              {/* Workflows */}
              <div className="text-center px-4 text-sm">
                {c.workflows.total > 0 ? (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium">
                      {c.workflows.completed}/{c.workflows.total}
                    </p>
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden mx-auto">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{
                          width: `${Math.round((c.workflows.completed / c.workflows.total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              {/* Docs attendus */}
              <div className="text-center px-4">
                {c.pendingDocuments > 0 ? (
                  <span className="text-xs font-medium text-amber-600">
                    {c.pendingDocuments} doc{c.pendingDocuments > 1 ? "s" : ""}
                  </span>
                ) : (
                  <CheckCircle2 className="size-3.5 text-emerald-500 mx-auto" />
                )}
              </div>

              {/* Action */}
              <div className="text-center px-4">
                {!c.autopilotActive ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={running}
                    onClick={() => handleRun([c.id])}
                  >
                    <Zap className="size-3 mr-1" />
                    Lancer
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    disabled={running}
                    onClick={() => handleRun([c.id])}
                  >
                    <RefreshCw className="size-3 mr-1" />
                    Sync
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-dashed p-4 flex items-start gap-3">
        <Clock className="size-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Comment fonctionne le pilote automatique ?</p>
          <p>Pour chaque client actif, le pilote génère toutes les obligations fiscales de l'année selon son profil (type d'entité, fin d'exercice, employés, fréquence TPS). Chaque obligation crée un workflow avec les tâches prédéfinies et la liste des documents à collecter.</p>
          <p>Le pilote est idempotent — il peut être relancé sans créer de doublons. Utilisez "Sync" pour ajouter les obligations manquantes d'un client.</p>
          <p>
            <strong>Profil fiscal</strong> à compléter pour chaque client dans{" "}
            <Link href="/clients" className="underline">la fiche client</Link> : fin d'exercice, employés, fréquence TPS, acomptes provisionnels.
          </p>
        </div>
      </div>
    </div>
  );
}
