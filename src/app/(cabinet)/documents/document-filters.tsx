"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUS_FILTERS = [
  { label: "Tous", value: "" },
  { label: "En attente", value: "PENDING" },
  { label: "Traités", value: "PROCESSED" },
  { label: "Rejetés", value: "REJECTED" },
] as const;

const CATEGORY_FILTERS = [
  { label: "Toutes catégories", value: "", sub: [] },
  {
    label: "01 — DAS",
    value: "DAS",
    sub: [
      { label: "A — Fiches de paies", value: "A" },
      { label: "B — Rapport DAS gouvernements", value: "B" },
      { label: "C — Autres", value: "C" },
    ],
  },
  {
    label: "02 — TPS/TVQ",
    value: "TPS_TVQ",
    sub: [
      { label: "A — Factures TPS/TVQ par période", value: "A" },
      { label: "B — Rapport TPS/TVQ gouvernements", value: "B" },
      { label: "C — Autres TPS/TVQ", value: "C" },
    ],
  },
  {
    label: "03 — T2/CO-17",
    value: "FINANCIAL_STATEMENT",
    sub: [
      { label: "A — États financiers", value: "A" },
      { label: "B — Rapport T2/CO-17 gouvernements", value: "B" },
      { label: "C — Autres T2/CO-17", value: "C" },
    ],
  },
  { label: "04 — T1", value: "T1", sub: [] },
  { label: "05 — REQ", value: "REQ_DOC", sub: [] },
  { label: "06 — Immobilisation & investissements", value: "IMMOBILISATION", sub: [] },
] as const;

export function DocumentFilters({
  currentStatus,
  currentCategory,
  currentSubcategory,
}: {
  currentStatus?: string;
  currentCategory?: string;
  currentSubcategory?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string, resetKeys: string[] = []) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    resetKeys.forEach((k) => params.delete(k));
    router.push(`/documents?${params.toString()}`);
  }

  const activeCat = CATEGORY_FILTERS.find((c) => c.value === (currentCategory ?? ""));
  const subFilters = activeCat?.sub ?? [];

  return (
    <div className="space-y-2">
      {/* Statut */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((f) => {
          const isActive = f.value === (currentStatus ?? "");
          return (
            <button
              key={f.value}
              onClick={() => setParam("status", f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "border border-input bg-background hover:bg-muted text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Catégorie */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {CATEGORY_FILTERS.map((f) => {
          const isActive = f.value === (currentCategory ?? "");
          return (
            <button
              key={f.value}
              onClick={() => setParam("category", f.value, ["subcategory"])}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "border border-input bg-background hover:bg-muted text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Sous-catégorie — apparaît seulement pour 01, 02, 03 */}
      {subFilters.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pl-4 border-l-2 border-muted">
          <button
            onClick={() => setParam("subcategory", "")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !currentSubcategory
                ? "bg-primary text-primary-foreground"
                : "border border-input bg-background hover:bg-muted text-muted-foreground"
            }`}
          >
            Toutes
          </button>
          {subFilters.map((s) => {
            const isActive = s.value === currentSubcategory;
            return (
              <button
                key={s.value}
                onClick={() => setParam("subcategory", s.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "border border-input bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
