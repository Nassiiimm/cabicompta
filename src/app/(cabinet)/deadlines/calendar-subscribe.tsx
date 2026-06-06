"use client";

import { useState } from "react";
import { getCalendarUrlAction, rotateCalendarUrlAction } from "./calendar-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CalendarSubscribe() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function reveal() {
    setLoading(true);
    setUrl(await getCalendarUrlAction());
    setLoading(false);
  }
  async function rotate() {
    setLoading(true);
    setUrl(await rotateCalendarUrlAction());
    setLoading(false);
  }
  async function copy() {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!url) {
    return (
      <Button size="sm" variant="outline" onClick={reveal} disabled={loading}>
        {loading ? "…" : "S'abonner au calendrier"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 max-w-xl">
      <Input readOnly value={url} className="h-8 text-xs font-mono" onFocus={(e) => e.target.select()} />
      <Button size="sm" variant="outline" onClick={copy}>{copied ? "Copié ✓" : "Copier"}</Button>
      <Button size="sm" variant="ghost" onClick={rotate} title="Révoque l'ancien lien">Régénérer</Button>
    </div>
  );
}
