"use client";

import { FileText, Download } from "lucide-react";

type Doc = {
  id: string;
  fileName: string;
  fileSize: number | null;
  category: string | null;
  status: string;
  createdAt: Date;
};

async function handleDownload(docId: string) {
  try {
    const res = await fetch(`/api/documents/${docId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.downloadUrl) window.open(data.downloadUrl, "_blank");
    }
  } catch {}
}

export function PortalDocumentList({ documents }: { documents: Doc[] }) {
  return (
    <div className="rounded-lg border divide-y">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="size-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm truncate">{doc.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {doc.status === "PROCESSED" ? "Traité" : doc.status === "REJECTED" ? "Rejeté" : "En attente"}
                {" · "}
                {new Date(doc.createdAt).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
              </p>
            </div>
          </div>
          <button onClick={() => handleDownload(doc.id)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <Download className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
