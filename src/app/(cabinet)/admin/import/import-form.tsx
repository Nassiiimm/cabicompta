"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, FileText } from "lucide-react";

type ImportResult = { created: number; skipped: number; total: number; errors: string[] };

export function ImportForm() {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setCsv(await f.text());
    setResult(null);
    setError("");
  };

  const submit = async () => {
    if (!csv.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await fetch("/api/admin/import-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erreur lors de l'import");
      setResult(data as ImportResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 px-4 cursor-pointer hover:border-foreground/20 transition-colors">
        <Upload className="size-5 text-muted-foreground" />
        <span className="text-sm">
          {fileName ? (
            <span className="inline-flex items-center gap-1.5">
              <FileText className="size-3.5" /> {fileName}
            </span>
          ) : (
            <>Choisir un fichier CSV</>
          )}
        </span>
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={submit} disabled={loading || !csv.trim()} className="w-full">
        {loading ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Import en cours…</> : "Importer les clients"}
      </Button>

      {result && (
        <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4 text-sm space-y-1">
          <p className="flex items-center gap-2 font-medium text-green-800 dark:text-green-300">
            <CheckCircle2 className="size-4" /> Import terminé
          </p>
          <p className="text-green-700 dark:text-green-400">
            {result.created} client{result.created > 1 ? "s" : ""} créé{result.created > 1 ? "s" : ""} ·{" "}
            {result.skipped} ignoré{result.skipped > 1 ? "s" : ""} (doublons) · {result.total} ligne
            {result.total > 1 ? "s" : ""} lue{result.total > 1 ? "s" : ""}
          </p>
          {result.errors.length > 0 && (
            <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc pl-4 pt-1">
              {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
