"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, FileText } from "lucide-react";

type ClientResult = {
  id: string;
  name: string;
  type: string | null;
  status: string;
};

type DocumentResult = {
  id: string;
  fileName: string;
  category: string | null;
  companyId: string;
};

const TYPE_LABELS: Record<string, string> = {
  T1_PARTICULIER: "T1 — Particulier",
  T1_AUTONOME: "T1 — Autonome",
  T2_SOCIETE: "T2 — Société",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<ClientResult[]>([]);
  const [documents, setDocuments] = useState<DocumentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setClients([]);
      setDocuments([]);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setClients([]);
      setDocuments([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients ?? []);
        setDocuments(data.documents ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 250);
  }

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  const hasResults = clients.length > 0 || documents.length > 0;
  const showEmpty = query.length >= 2 && !loading && !hasResults;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            placeholder="Rechercher clients, documents…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex text-[10px] font-mono text-muted-foreground border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {(hasResults || showEmpty || loading) && (
          <div className="max-h-80 overflow-y-auto py-2">
            {loading && (
              <p className="px-4 py-3 text-sm text-muted-foreground">Recherche…</p>
            )}

            {showEmpty && (
              <p className="px-4 py-3 text-sm text-muted-foreground">Aucun résultat pour « {query} »</p>
            )}

            {!loading && clients.length > 0 && (
              <div>
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Clients
                </p>
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/clients/${c.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.type && (
                        <p className="text-xs text-muted-foreground">{TYPE_LABELS[c.type] ?? c.type}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loading && documents.length > 0 && (
              <div>
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Documents
                </p>
                {documents.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => navigate(`/clients/${d.companyId}?tab=documents`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <p className="text-sm truncate">{d.fileName}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hint when empty */}
        {!query && (
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-muted-foreground">
              Tapez au moins 2 caractères pour rechercher
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
