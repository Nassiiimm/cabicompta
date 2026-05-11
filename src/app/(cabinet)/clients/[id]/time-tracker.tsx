"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Plus, Receipt } from "lucide-react";

type Entry = {
  id: string;
  duration: number;
  description: string;
  date: string;
  billable: boolean;
};

export function TimeTracker({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(150);
  const [invoicing, setInvoicing] = useState(false);

  useEffect(() => {
    fetch(`/api/time-entries?companyId=${companyId}`)
      .then((r) => (r.ok ? r.json() : { entries: [], totalMinutes: 0 }))
      .then((d) => {
        setEntries(d.entries);
        setTotalMinutes(d.totalMinutes);
      })
      .catch(() => {});
  }, [companyId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const hours = parseInt(fd.get("hours") as string) || 0;
    const minutes = parseInt(fd.get("minutes") as string) || 0;
    const duration = hours * 60 + minutes;

    if (duration <= 0) {
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          duration,
          description: fd.get("description"),
          date: fd.get("date"),
          billable: true,
        }),
      });
      if (res.ok) {
        const entry = await res.json();
        setEntries((prev) => [entry, ...prev]);
        setTotalMinutes((prev) => prev + duration);
        setOpen(false);
      }
    } catch {
    } finally {
      setSaving(false);
    }
  }

  const formatDuration = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
  };

  async function handleInvoice() {
    if (entries.length === 0) return;
    setInvoicing(true);
    try {
      const res = await fetch("/api/time-entries/to-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          entryIds: entries.map((e) => e.id),
          hourlyRate,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem(
          "invoice-prefill",
          JSON.stringify(data)
        );
        router.push("/invoices/new?prefill=true");
      }
    } catch {
      // silent
    } finally {
      setInvoicing(false);
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Temps passe</h3>
          <span className="text-xs text-muted-foreground">
            ({formatDuration(totalMinutes)} total)
          </span>
        </div>
        <div className="flex items-center gap-1">
          {entries.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInvoiceOpen(!invoiceOpen)}
            >
              <Receipt className="size-3 mr-1" />
              Facturer le temps
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(!open)}
          >
            <Plus className="size-3 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      {invoiceOpen && (
        <div className="space-y-2 mb-3 p-3 bg-muted/30 rounded-md">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              Taux horaire ($)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
              className="w-24 h-8 text-sm"
            />
            <Button size="sm" onClick={handleInvoice} disabled={invoicing}>
              {invoicing ? "Chargement..." : "Generer la facture"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {entries.length} entree{entries.length > 1 ? "s" : ""} seront converties en lignes de facture.
          </p>
        </div>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="space-y-2 mb-3 p-3 bg-muted/30 rounded-md">
          <div className="flex gap-2">
            <div className="flex items-center gap-1">
              <Input name="hours" type="number" min="0" max="24" defaultValue="0" className="w-16 h-8 text-sm" />
              <span className="text-xs text-muted-foreground">h</span>
            </div>
            <div className="flex items-center gap-1">
              <Input name="minutes" type="number" min="0" max="59" defaultValue="30" className="w-16 h-8 text-sm" />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
            <Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} className="h-8 text-sm flex-1" required />
          </div>
          <Input name="description" placeholder="Description du travail" className="h-8 text-sm" required />
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Aucune entrée</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {entries.slice(0, 10).map((e) => (
            <div key={e.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/30">
              <div className="min-w-0">
                <p className="text-xs truncate">{e.description}</p>
                <p className="text-[11px] text-muted-foreground">{e.date}</p>
              </div>
              <span className="text-xs font-medium shrink-0 ml-2">{formatDuration(e.duration)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
