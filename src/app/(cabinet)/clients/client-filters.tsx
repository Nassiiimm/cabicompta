"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUS_FILTERS = [
  { label: "Tous", value: "" },
  { label: "Actifs", value: "ACTIVE" },
  { label: "Inactifs", value: "INACTIVE" },
  { label: "Archivés", value: "ARCHIVED" },
] as const;

const TYPE_FILTERS = [
  { label: "Tous types", value: "" },
  { label: "T1 — Particulier", value: "T1_PARTICULIER" },
  { label: "T1 — Autonome", value: "T1_AUTONOME" },
  { label: "T2 — Société", value: "T2_SOCIETE" },
] as const;

export function ClientFilters({
  currentStatus,
  currentType,
}: {
  currentStatus?: string;
  currentType?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/clients?${params.toString()}`);
  }

  return (
    <div className="space-y-2">
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
      <div className="flex items-center gap-1.5 flex-wrap">
        {TYPE_FILTERS.map((f) => {
          const isActive = f.value === (currentType ?? "");
          return (
            <button
              key={f.value}
              onClick={() => setParam("type", f.value)}
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
    </div>
  );
}
