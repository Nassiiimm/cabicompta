"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarClock, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function GenerateDeadlinesButton({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/fiscal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, year: new Date().getFullYear() }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        toast.success("Échéances générées");
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <Button variant="outline" disabled>
        <CheckCircle2 className="h-4 w-4 mr-2 text-success" />
        {result.inserted} échéance{result.inserted > 1 ? "s" : ""} ajoutée{result.inserted > 1 ? "s" : ""}
      </Button>
    );
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <CalendarClock className="h-4 w-4 mr-2" />
      )}
      Générer les échéances {new Date().getFullYear()}
    </Button>
  );
}
