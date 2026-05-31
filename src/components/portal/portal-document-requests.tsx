"use client";

import { useState, useRef } from "react";
import { CheckCircle2, Circle, Upload, Loader2, AlertCircle } from "lucide-react";

type DocRequest = {
  id: string;
  label: string;
  description: string | null;
  required: boolean;
  status: string;
  dueDate: string | null;
};

type Props = {
  companyId: string;
  requests: DocRequest[];
};

function DaysLeft({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return null;
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return <span className="text-[11px] text-red-500 font-medium">En retard</span>;
  if (days <= 7) return <span className="text-[11px] text-amber-500 font-medium">{days}j restants</span>;
  return <span className="text-[11px] text-muted-foreground">{days}j restants</span>;
}

function RequestCard({
  request,
  companyId,
  onDone,
}: {
  request: DocRequest;
  companyId: string;
  onDone: (id: string, docId: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const received = request.status === "RECEIVED";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      // 1. Upload le fichier
      const fd = new FormData();
      fd.append("file", file);
      fd.append("companyId", companyId);
      fd.append("fiscalYear", new Date().getFullYear().toString());
      fd.append("category", "OTHER");
      const uploadRes = await fetch("/api/documents", { method: "POST", body: fd });
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error || "Erreur upload");
      const { document } = await uploadRes.json();

      // 2. Marque la demande comme reçue
      await fetch(`/api/document-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RECEIVED", documentId: document.id }),
      });

      onDone(request.id, document.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
        received
          ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20"
          : "border-border bg-card hover:bg-muted/30"
      }`}
    >
      {/* Icône statut */}
      <div className="mt-0.5 shrink-0">
        {received ? (
          <CheckCircle2 className="size-4.5 text-emerald-500" />
        ) : (
          <Circle className="size-4.5 text-muted-foreground/50" />
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className={`text-sm font-medium leading-tight ${received ? "text-emerald-800 dark:text-emerald-200 line-through opacity-70" : ""}`}>
            {request.label}
            {request.required && !received && (
              <span className="ml-1.5 text-[10px] font-semibold text-red-500 uppercase tracking-wide">Requis</span>
            )}
          </p>
          <DaysLeft dueDate={request.dueDate} />
        </div>

        {request.description && !received && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{request.description}</p>
        )}

        {received ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Document reçu ✓</p>
        ) : (
          <div className="mt-2">
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv"
              onChange={handleFile}
              disabled={uploading}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:border-foreground/30 hover:bg-muted transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <><Loader2 className="size-3 animate-spin" />Envoi en cours…</>
              ) : (
                <><Upload className="size-3" />Envoyer ce document</>
              )}
            </button>
            {error && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="size-3" />{error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PortalDocumentRequests({ companyId, requests: initialRequests }: Props) {
  const [requests, setRequests] = useState<DocRequest[]>(initialRequests);

  const pending = requests.filter((r) => r.status === "PENDING");
  const received = requests.filter((r) => r.status === "RECEIVED");

  if (requests.length === 0) return null;

  function handleDone(id: string) {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "RECEIVED" } : r))
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Documents demandés par votre comptable
        </p>
        <span className="text-xs text-muted-foreground">
          {received.length}/{requests.length} reçus
        </span>
      </div>

      {/* Barre de progression globale */}
      {requests.length > 0 && (
        <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.round((received.length / requests.length) * 100)}%` }}
          />
        </div>
      )}

      {/* Demandes en attente */}
      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              companyId={companyId}
              onDone={(id) => handleDone(id)}
            />
          ))}
        </div>
      )}

      {/* Demandes reçues (affichées en condensé) */}
      {received.length > 0 && (
        <div className="space-y-1.5">
          {received.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              companyId={companyId}
              onDone={(id) => handleDone(id)}
            />
          ))}
        </div>
      )}

      {pending.length === 0 && received.length > 0 && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium">
          ✓ Tous les documents ont été envoyés
        </p>
      )}
    </div>
  );
}
