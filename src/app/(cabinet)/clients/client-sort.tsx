"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronUp, ChevronDown } from "lucide-react";

const SORT_OPTIONS = [
  { value: "name", label: "Nom" },
  { value: "status", label: "Statut" },
  { value: "type", label: "Type" },
  { value: "createdAt", label: "Date d'ajout" },
];

export function ClientSort({ currentSort, currentDir }: { currentSort?: string; currentDir?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSort(field: string) {
    const params = new URLSearchParams(searchParams.toString());
    const newDir = currentSort === field && currentDir === "asc" ? "desc" : "asc";
    params.set("sort", field);
    params.set("dir", newDir);
    router.push(`/clients?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1">Trier :</span>
      {SORT_OPTIONS.map((opt) => {
        const active = currentSort === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => handleSort(opt.value)}
            className={`flex items-center gap-0.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              active
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
            {active && (
              currentDir === "asc"
                ? <ChevronUp className="size-3" />
                : <ChevronDown className="size-3" />
            )}
          </button>
        );
      })}
    </div>
  );
}
