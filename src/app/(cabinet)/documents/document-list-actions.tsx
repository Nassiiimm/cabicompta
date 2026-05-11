"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckSquare, ChevronDown, ChevronRight } from "lucide-react";
import { DocumentComments } from "@/components/cabinet/document-comments";

type Doc = {
  id: string;
  fileName: string;
  fileSize: number | null;
  category: string | null;
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

const CATEGORY_LABELS: Record<string, string> = {
  BANK_STATEMENT: "Releve bancaire",
  INVOICE: "Facture",
  TAX_NOTICE: "Avis de cotisation",
  FINANCIAL_STATEMENT: "Etat financier",
  TPS_TVQ: "TPS/TVQ",
  CORPORATE: "Corporatif",
  CONTRACT: "Contrat",
  RECEIPT: "Recu",
  OTHER: "Autre",
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

export function DocumentListActions({ documents }: { documents: Doc[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  async function handleMarkProcessed() {
    setProcessing(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/documents/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "PROCESSED" }),
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
            <Button
              size="sm"
              onClick={handleMarkProcessed}
              disabled={processing}
            >
              <CheckSquare className="size-3 mr-1" />
              {processing
                ? "Traitement..."
                : `Marquer traites (${selected.size})`}
            </Button>
          )}
        </div>
      </div>

      {/* Document list */}
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

              {/* Badges + link */}
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Badge variant="secondary" className="text-[10px]">
                  {CATEGORY_LABELS[doc.category ?? "OTHER"] ?? doc.category}
                </Badge>
                <Badge
                  variant={STATUS_VARIANT[doc.status] ?? "outline"}
                  className="text-[10px]"
                >
                  {STATUS_LABELS[doc.status] ?? doc.status}
                </Badge>
                <a
                  href={`/api/documents/${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voir
                </a>
              </div>
            </div>

            {/* Expanded: comments */}
            {expandedId === doc.id && (
              <div className="px-4 pb-3 pt-1 ml-10 border-t bg-muted/10">
                <DocumentComments documentId={doc.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
