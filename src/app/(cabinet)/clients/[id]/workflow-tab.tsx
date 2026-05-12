"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronDown, ChevronRight, CheckCircle2, Circle, Loader2, Trash2, GitBranch, Lock } from "lucide-react";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "SKIPPED";
type WorkflowStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

type Task = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  status: TaskStatus;
  notes: string | null;
  estimatedMinutes: number | null;
  completedAt: string | null;
  assignedToName: string | null;
  blockedBy: string | null;
  dueDate: string | null;
};

type WorkflowItem = {
  id: string;
  name: string;
  status: WorkflowStatus;
  dueDate: string | null;
  fiscalPeriod: string | null;
  assignedToName: string | null;
  tasks: Task[];
};

type Template = {
  id: string;
  name: string;
  tasks: { title: string; order: number; estimatedMinutes: number | null }[];
};

const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  NOT_STARTED: "Non démarré",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

const WORKFLOW_STATUS_VARIANTS: Record<WorkflowStatus, "outline" | "default" | "secondary" | "destructive"> = {
  NOT_STARTED: "outline",
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  DONE: "Terminé",
  SKIPPED: "Ignoré",
};

function taskStatusIcon(status: TaskStatus, blocked: boolean) {
  if (blocked) return <Lock className="size-4 text-muted-foreground opacity-50" />;
  if (status === "DONE") return <CheckCircle2 className="size-4 text-green-600" />;
  if (status === "IN_PROGRESS") return <Loader2 className="size-4 text-blue-600 animate-spin" />;
  if (status === "SKIPPED") return <Circle className="size-4 text-muted-foreground opacity-40" />;
  return <Circle className="size-4 text-muted-foreground" />;
}

function progressBar(tasks: Task[]) {
  if (tasks.length === 0) return null;
  const done = tasks.filter((t) => t.status === "DONE" || t.status === "SKIPPED").length;
  const pct = Math.round((done / tasks.length) * 100);
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span>{done}/{tasks.length}</span>
    </div>
  );
}

export function WorkflowTab({ companyId }: { companyId: string }) {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", templateId: "", dueDate: "" });
  const [saving, setSaving] = useState(false);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, tRes] = await Promise.all([
        fetch(`/api/workflows?companyId=${companyId}`),
        fetch("/api/workflow-templates"),
      ]);
      const wData = wRes.ok ? await wRes.json() : { workflows: [] };
      const tData = tRes.ok ? await tRes.json() : { templates: [] };

      // Fetch tasks for each workflow
      const withTasks = await Promise.all(
        (wData.workflows ?? []).map(async (w: WorkflowItem) => {
          const r = await fetch(`/api/workflows/${w.id}`);
          if (r.ok) {
            const d = await r.json();
            return d.workflow;
          }
          return { ...w, tasks: [] };
        })
      );

      setWorkflows(withTasks);
      setTemplates(tData.templates ?? []);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const selected = templates.find((t) => t.id === form.templateId);
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name: form.name || selected?.name || "Nouveau workflow",
          templateId: form.templateId || null,
          dueDate: form.dueDate || null,
        }),
      });
      if (res.ok) {
        setCreating(false);
        setForm({ name: "", templateId: "", dueDate: "" });
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleTaskToggle(workflowId: string, task: Task, tasks: Task[]) {
    // Vérifier si la tâche est bloquée par une tâche non terminée
    if (task.blockedBy) {
      const blocker = tasks.find((t) => t.id === task.blockedBy);
      if (blocker && blocker.status !== "DONE" && blocker.status !== "SKIPPED") return;
    }

    setUpdatingTask(task.id);
    const nextStatus: TaskStatus =
      task.status === "TODO" ? "IN_PROGRESS"
      : task.status === "IN_PROGRESS" ? "DONE"
      : task.status === "DONE" ? "TODO"
      : "TODO";

    try {
      const res = await fetch(`/api/workflows/${workflowId}/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setWorkflows((prev) =>
          prev.map((w) =>
            w.id === workflowId
              ? {
                  ...w,
                  tasks: w.tasks.map((t) =>
                    t.id === task.id ? { ...t, status: nextStatus } : t
                  ),
                }
              : w
          )
        );
        // Reload pour sync du statut du workflow
        await load();
      }
    } finally {
      setUpdatingTask(null);
    }
  }

  async function handleDelete(workflowId: string) {
    if (!confirm("Supprimer ce workflow ?")) return;
    await fetch(`/api/workflows/${workflowId}`, { method: "DELETE" });
    setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <GitBranch className="size-4" />
          Workflows ({workflows.length})
        </h2>
        <Button variant="outline" size="sm" onClick={() => setCreating(!creating)}>
          <Plus className="size-3 mr-1" />
          Nouveau workflow
        </Button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="rounded-lg border p-4 space-y-3 bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Modèle (optionnel)</label>
              <select
                value={form.templateId}
                onChange={(e) => {
                  const t = templates.find((t) => t.id === e.target.value);
                  setForm((f) => ({ ...f, templateId: e.target.value, name: t?.name ?? f.name }));
                }}
                className="w-full h-8 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">— Sans modèle —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nom du workflow</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="ex: Bilan annuel 2024"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Date limite (optionnel)</label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="h-8 text-sm w-48"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Création..." : "Créer"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
              Annuler
            </Button>
          </div>
        </form>
      )}

      {workflows.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <GitBranch className="size-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucun workflow pour ce client.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Créez un workflow depuis un modèle ou de zéro.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map((w) => (
            <div key={w.id} className="rounded-lg border">
              <button
                onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
              >
                {expanded === w.id
                  ? <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                  : <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{w.name}</span>
                    <Badge variant={WORKFLOW_STATUS_VARIANTS[w.status]}>
                      {WORKFLOW_STATUS_LABELS[w.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    {progressBar(w.tasks)}
                    {w.dueDate && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        Échéance : {new Date(w.dueDate).toLocaleDateString("fr-CA")}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(w.id); }}
                  className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ml-2"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </button>

              {expanded === w.id && (
                <div className="border-t px-4 pb-3 bg-muted/10">
                  {w.tasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3">Aucune tâche dans ce workflow.</p>
                  ) : (
                    <ul className="divide-y">
                      {w.tasks.map((task) => (
                        <li key={task.id} className="flex items-start gap-3 py-2.5">
                          {(() => {
                            const blocker = task.blockedBy ? w.tasks.find((t) => t.id === task.blockedBy) : null;
                            const isBlocked = !!blocker && blocker.status !== "DONE" && blocker.status !== "SKIPPED";
                            const today = new Date().toISOString().split("T")[0];
                            const isOverdue = task.dueDate && task.dueDate < today && task.status !== "DONE" && task.status !== "SKIPPED";
                            return (
                              <>
                                <button
                                  onClick={() => handleTaskToggle(w.id, task, w.tasks)}
                                  disabled={updatingTask === task.id || isBlocked}
                                  title={isBlocked ? `Bloquée par : ${blocker?.title}` : undefined}
                                  className="mt-0.5 shrink-0 disabled:cursor-not-allowed"
                                >
                                  {taskStatusIcon(task.status, isBlocked)}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${task.status === "DONE" ? "line-through text-muted-foreground" : isBlocked ? "text-muted-foreground" : ""}`}>
                                    {task.title}
                                  </p>
                                  {isBlocked && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                      <Lock className="size-2.5" />
                                      Bloquée par : {blocker?.title}
                                    </p>
                                  )}
                                  {task.description && !isBlocked && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                    {task.dueDate && (
                                      <span className={`text-[11px] ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                                        {isOverdue ? "⚠ En retard — " : "Limite : "}
                                        {new Date(task.dueDate).toLocaleDateString("fr-CA")}
                                      </span>
                                    )}
                                    {task.estimatedMinutes && (
                                      <span className="text-[11px] text-muted-foreground">
                                        {task.estimatedMinutes >= 60
                                          ? `${Math.floor(task.estimatedMinutes / 60)}h${task.estimatedMinutes % 60 > 0 ? `${task.estimatedMinutes % 60}min` : ""}`
                                          : `${task.estimatedMinutes}min`}
                                      </span>
                                    )}
                                    {task.completedAt && (
                                      <span className="text-[11px] text-green-600">
                                        ✓ {new Date(task.completedAt).toLocaleDateString("fr-CA")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                          <Badge
                            variant={
                              task.status === "DONE" ? "secondary"
                              : task.status === "IN_PROGRESS" ? "default"
                              : "outline"
                            }
                            className="text-[10px] shrink-0"
                          >
                            {TASK_STATUS_LABELS[task.status]}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
