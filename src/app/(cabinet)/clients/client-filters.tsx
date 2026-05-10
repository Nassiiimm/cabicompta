"use client";

import { useRouter, useSearchParams } from "next/navigation";

const FILTERS = [
  { label: "Tous", value: "" },
  { label: "Actifs", value: "ACTIVE" },
  { label: "Inactifs", value: "INACTIVE" },
] as const;

export function ClientFilters({ currentStatus }: { currentStatus?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleClick(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    const qs = params.toString();
    router.push(`/clients${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      {FILTERS.map((f) => {
        const isActive = f.value === (currentStatus ?? "");
        return (
          <button
            key={f.value}
            onClick={() => handleClick(f.value)}
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
  );
}
