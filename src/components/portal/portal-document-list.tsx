"use client";

import { useState } from "react";
import { FileText, Eye, Trash2, Clock, CheckCircle2, XCircle } from "lucide-react";

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

type Doc = {
  id: string;
  fileName: string;
  fileSize: number | null;
  category: string | null;
  status: string;
  createdAt: Date;
};

export function PortalDocumentList({ documents: initialDocs }: { documents: Doc[] }) {
  const [docs, setDocs] = useState(initialDocs);

  async function handleDelete(docId: string) {
    if (!confirm("Supprimer ce document ?")) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch {}
  }

  return (
    <>
      <div className="rounded-lg border divide-y">
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="size-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm truncate">{doc.fileName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {STATUS_ICON[doc.status]}
                  {STATUS_LABEL[doc.status] ?? doc.status}
                  {" · "}
                  {new Date(doc.createdAt).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
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
    </>
  );
}
