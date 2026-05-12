"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LayoutList, Columns3, AlertTriangle } from "lucide-react";

type WorkflowRow = {
  id: string;
  name: string;
  status: string;
  dueDate: string | null;
  fiscalPeriod: string | null;
  companyId: string;
  companyName: string | null;
  assignedToName: string | null;
  assignedToId: string | null;
  total: number;
  done: number;
  overdue: number;
};

type Props = {
  workflows: WorkflowRow[];
  statusLabels: Record<string, string>;
  statusVariants: Record<string, "outline" | "default" | "secondary" | "destructive">;
  currentUserId: string;
};

const STATUS_ORDER = ["IN_PROGRESS", "NOT_STARTED", "COMPLETED", "CANCELLED"];
const KANBAN_COLUMNS = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

function ProgressBar({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-muted-foreground shrink-0">{done}/{total}</span>
    </div>
  );
}

function DaysLabel({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return null;
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  return (
    <span className={`text-xs font-medium ${
      days < 0 ? "text-destructive"
      : days <= 7 ? "text-amber-600"
      : "text-muted-foreground"
    }`}>
      {days < 0 ? `${Math.abs(days)}j retard` : days === 0 ? "Aujourd'hui" : `${days}j`}
    </span>
  );
}

function WorkflowCard({
  w,
  statusLabels,
  statusVariants,
}: {
  w: WorkflowRow;
  statusLabels: Record<string, string>;
  statusVariants: Record<string, "outline" | "default" | "secondary" | "destructive">;
}) {
  return (
    <Link
      href={`/clients/${w.companyId}?tab=workflows`}
      className="block rounded-lg border p-3 hover:bg-muted/30 transition-colors space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{w.name}</p>
        {w.overdue > 0 && (
          <AlertTriangle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">{w.companyName}</p>
      {w.total > 0 && <ProgressBar done={w.done} total={w.total} />}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{w.assignedToName ?? "—"}</span>
        <DaysLabel dueDate={w.dueDate} />
      </div>
    </Link>
  );
}

export function WorkflowsView({ workflows, statusLabels, statusVariants, currentUserId }: Props) {
  const [view, setView] = useState<"list" | "kanban">("list");
  const [mine, setMine] = useState(false);

  const visible = useMemo(
    () => mine ? workflows.filter((w) => w.assignedToId === currentUserId) : workflows,
    [workflows, mine, currentUserId]
  );

  if (workflows.length === 0) {
    return (
      <div className="rounded-lg border p-12 text-center">
        <p className="text-sm font-medium">Aucun workflow</p>
        <p className="text-xs text-muted-foreground mt-1">
          Créez des workflows depuis la fiche d&apos;un client.
        </p>
      </div>
    );
  }

  const grouped = visible.reduce<Record<string, WorkflowRow[]>>((acc, w) => {
    if (!acc[w.status]) acc[w.status] = [];
    acc[w.status].push(w);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 border rounded-md p-0.5 w-fit">
        <button
          onClick={() => setView("list")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
            view === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutList className="size-3.5" />
          Liste
        </button>
        <button
          onClick={() => setView("kanban")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
            view === "kanban" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Columns3 className="size-3.5" />
          Kanban
        </button>
        </div>
        <button
          onClick={() => setMine((m) => !m)}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
            mine ? "bg-foreground text-background border-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {mine ? `Mes workflows (${visible.length})` : "Tout voir"}
        </button>
      </div>

      {/* Vue liste */}
      {view === "list" && (
        <div className="space-y-6">
          {STATUS_ORDER.map((status) => {
            const items = grouped[status];
            if (!items?.length) return null;
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="rounded-lg border divide-y">
                  {items.map((w) => {
                    const today = new Date().toISOString().split("T")[0];
                    const daysLeft = w.dueDate
                      ? Math.ceil((new Date(w.dueDate).getTime() - Date.now()) / 86400000)
                      : null;
                    return (
                      <Link
                        key={w.id}
                        href={`/clients/${w.companyId}?tab=workflows`}
                        className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium truncate">{w.name}</p>
                            {w.overdue > 0 && (
                              <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{w.companyName}</p>
                          {w.total > 0 && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.round((w.done / w.total) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-muted-foreground">{w.done}/{w.total}</span>
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          {w.assignedToName && (
                            <p className="text-xs text-muted-foreground">{w.assignedToName}</p>
                          )}
                          <DaysLabel dueDate={w.dueDate} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vue kanban */}
      {view === "kanban" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          {KANBAN_COLUMNS.map((status) => {
            const items = grouped[status] ?? [];
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Badge variant={statusVariants[status]} className="text-[10px]">
                    {statusLabels[status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  {items.map((w) => (
                    <WorkflowCard
                      key={w.id}
                      w={w}
                      statusLabels={statusLabels}
                      statusVariants={statusVariants}
                    />
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed p-4 text-center">
                      <p className="text-xs text-muted-foreground">Vide</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
