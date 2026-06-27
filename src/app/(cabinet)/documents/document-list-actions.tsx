"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckSquare, XSquare, ChevronDown, ChevronRight, Pencil, X, Check } from "lucide-react";
import { DocumentComments } from "@/components/cabinet/document-comments";
import { CATEGORY_LABELS, VALID_CATEGORIES, SUBCATEGORIES_BY_CATEGORY } from "@/lib/document-categories";

type Doc = {
  id: string;
  fileName: string;
  fileSize: number | null;
  category: string | null;
  subcategory: string | null;
  fiscalYear: number | null;
  status: string;
  createdAt: string | null;
  companyName: string | null;
  companyId?: string | null;
  uploaderName: string | null;
};

type Company = {
  id: string;
  name: string;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PROCESSED: "Traite",
  REJECTED: "Rejete",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PROCESSED: "default",
  REJECTED: "destructive",
};

export function DocumentListActions({ documents, emptyMessage }: { documents: Doc[]; emptyMessage?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ category: string; subcategory: string }>({ category: "", subcategory: "" });
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const currentCompanyId = searchParams.get("companyId") ?? "";

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Company[]) => {
        if (Array.isArray(data)) setCompanies(data);
      })
      .catch(() => {});
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === documents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(documents.map((d) => d.id)));
    }
  }

  async function handleBulkStatus(status: "PROCESSED" | "REJECTED") {
    setProcessing(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/documents/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      setSelected(new Set());
      router.refresh();
    } catch {
      // silent
    } finally {
      setProcessing(false);
    }
  }

  function startEdit(doc: Doc) {
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
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function handleCompanyFilter(companyId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (companyId) {
      params.set("companyId", companyId);
    } else {
      params.delete("companyId");
    }
    const qs = params.toString();
    router.push(`/documents${qs ? `?${qs}` : ""}`);
  }

  return (
    <>
    <div className="space-y-3">
      {/* Company filter + bulk actions */}
      <div className="flex items-center justify-between gap-2">
        <select
          value={currentCompanyId}
          onChange={(e) => handleCompanyFilter(e.target.value)}
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Tous les clients</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          {documents.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {selected.size === documents.length ? "Deselectioner tout" : "Tout selectionner"}
            </button>
          )}
          {selected.size > 0 && (
            <div className="flex items-center gap-1.5">
              <Button size="sm" onClick={() => handleBulkStatus("PROCESSED")} disabled={processing}>
                <CheckSquare className="size-3 mr-1" />
                {processing ? "…" : `Traités (${selected.size})`}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkStatus("REJECTED")} disabled={processing}>
                <XSquare className="size-3 mr-1" />
                Rejetés
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {documents.length === 0 && emptyMessage && (
        <div className="text-center py-12 border rounded-lg">
          <FileText className="size-6 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
      <div className="rounded-lg border divide-y">
        {documents.map((doc) => (
          <div key={doc.id}>
            <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selected.has(doc.id)}
                onChange={() => toggleSelect(doc.id)}
                className="size-3.5 rounded border accent-primary shrink-0"
              />

              {/* Expand toggle */}
              <button
                onClick={() =>
                  setExpandedId(expandedId === doc.id ? null : doc.id)
                }
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                {expandedId === doc.id ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>

              {/* Content */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className="size-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.companyName ?? "\u2014"}
                    {doc.fiscalYear ? ` \u00b7 ${doc.fiscalYear}` : ""}
                    {" \u00b7 "}
                    {doc.uploaderName ?? "\u2014"}
                    {" \u00b7 "}
                    {doc.createdAt
                      ? new Date(doc.createdAt).toLocaleDateString("fr-CA")
                      : "\u2014"}
                  </p>
                </div>
              </div>

              {/* Badges + actions */}
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Badge variant="secondary" className="text-[10px]">
                  {CATEGORY_LABELS[doc.category ?? "OTHER"] ?? doc.category}
                  {doc.subcategory ? ` · ${doc.subcategory}` : ""}
                </Badge>
                <Badge
                  variant={STATUS_VARIANT[doc.status] ?? "outline"}
                  className="text-[10px]"
                >
                  {STATUS_LABELS[doc.status] ?? doc.status}
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
                <Link
                  href={`/documents/${doc.id}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Détails
                </Link>
              </div>
            </div>

            {/* Edit panel */}
            {editingId === doc.id && (
              <div className="px-4 pb-3 pt-2 ml-10 border-t bg-muted/10 flex flex-wrap items-end gap-2">
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

            {/* Expanded: comments */}
            {expandedId === doc.id && (
              <div className="px-4 pb-3 pt-1 ml-10 border-t bg-muted/10">
                <DocumentComments documentId={doc.id} />
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
