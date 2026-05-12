"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Pencil } from "lucide-react";

type TemplateTask = {
  id?: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number | null;
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  tasks: TemplateTask[];
  createdAt: string;
};

export default function WorkflowTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTasks, setFormTasks] = useState<TemplateTask[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workflow-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setFormName("");
    setFormDesc("");
    setFormTasks([]);
  }

  function startEdit(t: Template) {
    setEditing(t.id);
    setCreating(false);
    setFormName(t.name);
    setFormDesc(t.description ?? "");
    setFormTasks(t.tasks.map((task) => ({ ...task })));
  }

  function addTask() {
    setFormTasks((prev) => [
      ...prev,
      { title: "", description: "", order: prev.length, estimatedMinutes: null },
    ]);
  }

  function removeTask(idx: number) {
    setFormTasks((prev) => prev.filter((_, i) => i !== idx).map((t, i) => ({ ...t, order: i })));
  }

  function updateTask(idx: number, field: keyof TemplateTask, value: string | number | null) {
    setFormTasks((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t))
    );
  }

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDesc.trim() || null,
        tasks: formTasks
          .filter((t) => t.title.trim())
          .map((t, i) => ({
            title: t.title.trim(),
            description: t.description.trim() || null,
            order: i,
            estimatedMinutes: t.estimatedMinutes,
          })),
      };

      const url = editing
        ? `/api/workflow-templates/${editing}`
        : "/api/workflow-templates";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCreating(false);
        setEditing(null);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce modèle ?")) return;
    await fetch(`/api/workflow-templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8">Chargement...</p>;
  }

  const isFormOpen = creating || !!editing;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Modèles de workflows</h1>
        {!isFormOpen && (
          <Button variant="outline" size="sm" onClick={startCreate}>
            <Plus className="size-3.5 mr-1.5" />
            Nouveau modèle
          </Button>
        )}
      </div>

      {isFormOpen && (
        <div className="rounded-lg border p-4 space-y-4 bg-muted/10">
          <h2 className="text-sm font-semibold">
            {editing ? "Modifier le modèle" : "Nouveau modèle"}
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nom du modèle *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="ex: Bilan annuel T2"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Description</label>
              <Input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Description optionnelle"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Étapes ({formTasks.length})
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={addTask}>
                <Plus className="size-3 mr-1" />
                Ajouter une étape
              </Button>
            </div>

            {formTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3 border rounded-md border-dashed">
                Aucune étape — cliquez sur &quot;Ajouter une étape&quot;
              </p>
            ) : (
              <div className="space-y-2">
                {formTasks.map((task, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-md border bg-background">
                    <GripVertical className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(idx, "title", e.target.value)}
                      placeholder="Titre de l'étape"
                      className="h-7 text-sm flex-1"
                    />
                    <Input
                      type="number"
                      min="1"
                      value={task.estimatedMinutes ?? ""}
                      onChange={(e) =>
                        updateTask(idx, "estimatedMinutes", e.target.value ? parseInt(e.target.value) : null)
                      }
                      placeholder="min"
                      className="h-7 text-sm w-20 shrink-0"
                    />
                    <button
                      onClick={() => removeTask(idx)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? "Enregistrement..." : editing ? "Mettre à jour" : "Créer le modèle"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setCreating(false); setEditing(null); }}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {templates.length === 0 && !isFormOpen ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">Aucun modèle de workflow.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Créez des modèles réutilisables (ex: Bilan T2, TPS trimestrielle, etc.)
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded-lg border">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  className="flex-1 flex items-center gap-2 text-left"
                >
                  {expanded === t.id
                    ? <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  }
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    {t.description && (
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground ml-auto mr-2">
                    {t.tasks.length} étape{t.tasks.length !== 1 ? "s" : ""}
                  </span>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(t)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              {expanded === t.id && t.tasks.length > 0 && (
                <div className="border-t px-4 pb-3 bg-muted/10">
                  <ol className="divide-y">
                    {t.tasks.map((task, idx) => (
                      <li key={task.id ?? idx} className="py-2 flex items-center gap-3 text-sm">
                        <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                        <span className="flex-1">{task.title}</span>
                        {task.estimatedMinutes && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {task.estimatedMinutes >= 60
                              ? `${Math.floor(task.estimatedMinutes / 60)}h${task.estimatedMinutes % 60 > 0 ? `${task.estimatedMinutes % 60}min` : ""}`
                              : `${task.estimatedMinutes}min`}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
