"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

const ANALYSES: { key: string; label: string }[] = [
  { key: "INVOICES", label: "Factures (CTI/RTI)" },
  { key: "BANK_STATEMENT", label: "Relevé bancaire" },
  { key: "PAYROLL_DAS", label: "Paie / DAS" },
  { key: "T4_RL1", label: "T4 / RL-1" },
  { key: "T4A", label: "T4A" },
  { key: "SALES", label: "Ventes (méthode rapide)" },
  { key: "FINANCIAL", label: "États financiers (T2)" },
  { key: "FINANCIAL_DETAILED", label: "États financiers détaillés" },
  { key: "GENERIC", label: "Classification auto" },
];

// Canal WEB : lance une analyse IA (API Anthropic payante) sur le document.
export function AnalyzeButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [type, setType] = useState("INVOICES");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/analyze/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Échec de l'analyse");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'analyse");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        disabled={busy}
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {ANALYSES.map((a) => (
          <option key={a.key} value={a.key}>{a.label}</option>
        ))}
      </select>
      <button
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-primary px-3 text-sm text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
      >
        <Sparkles className="size-3.5" />
        {busy ? "Analyse en cours…" : "Analyser"}
      </button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
