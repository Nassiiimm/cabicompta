"use client";

import { useState, useMemo } from "react";
import { FileText, Eye, Trash2, Search, FolderOpen, ArrowLeft, Clock, CheckCircle2, XCircle } from "lucide-react";

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING:   <Clock className="size-3 text-amber-500 shrink-0" />,
  PROCESSED: <CheckCircle2 className="size-3 text-green-500 shrink-0" />,
  REJECTED:  <XCircle className="size-3 text-red-500 shrink-0" />,
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  PROCESSED: "Traité",
  REJECTED: "Rejeté",
};
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

type Doc = {
  id: string;
  fileName: string;
  fileSize: number | null;
  category: string | null;
  fiscalYear: number | null;
  status: string;
  createdAt: Date;
};

const CATS: Record<string, string> = {
  DAS: "DAS",
  TPS_TVQ: "TPS/TVQ",
  FINANCIAL_STATEMENT: "État financier",
  T1: "Impôt T1",
  REQ_DOC: "Document REQ",
  IMMOBILISATION: "Immobilisation",
  BANK_STATEMENT: "Relevé bancaire",
  INVOICE: "Facture",
  TAX_NOTICE: "Avis de cotisation",
  CORPORATE: "Corporatif",
  CONTRACT: "Contrat",
  RECEIPT: "Reçu",
  OTHER: "Autre",
};

export function PortalArchive({ documents: initialDocs, years }: { documents: Doc[]; years: number[] }) {
  const [docs, setDocs] = useState(initialDocs);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  async function handleDelete(docId: string) {
    if (!confirm("Supprimer ce document ?")) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch {}
  }

  const cats = useMemo(() => [...new Set(docs.map((d) => d.category).filter(Boolean))] as string[], [docs]);

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (search && !d.fileName.toLowerCase().includes(search.toLowerCase())) return false;
      if (year && d.fiscalYear !== year) return false;
      if (cat && d.category !== cat) return false;
      return true;
    });
  }, [docs, search, year, cat]);

  const active = search || year || cat;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/portal" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="size-4" />
        </Link>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => { setYear(null); setCat(null); }}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${!active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
        >
          Tout ({docs.length})
        </button>
        {years.map((y) => (
          <button key={y} onClick={() => setYear(year === y ? null : y)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${year === y ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >{y}</button>
        ))}
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(cat === c ? null : c)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${cat === c ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >{CATS[c] ?? c}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <FolderOpen className="size-5 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{active ? "Aucun résultat" : "Aucun document"}</p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {filtered.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <FileText className="size-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm truncate">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                    {STATUS_ICON[doc.status]}
                    {STATUS_LABEL[doc.status] ?? doc.status}
                    {doc.category ? ` · ${CATS[doc.category] ?? doc.category}` : ""}
                    {doc.fiscalYear ? ` · ${doc.fiscalYear}` : ""}
                    {" · "}
                    {new Date(doc.createdAt).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => window.open(`/api/documents/${doc.id}/view`, "_blank")} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <Eye className="size-3.5" />
                </button>
                {doc.status === "PENDING" && (
                  <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {filtered.length} document{filtered.length > 1 ? "s" : ""}
        {active ? ` sur ${docs.length}` : ""}
      </p>
    </div>
  );
}
