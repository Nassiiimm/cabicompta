"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function RequestDocsButton({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          title: "Documents requis",
          message: `Votre comptable a besoin de documents pour compléter votre dossier. Veuillez vous connecter pour les déposer.`,
          type: "DOCUMENT",
          link: "/portal",
        }),
      });
      if (res.ok) {
        setSent(true);
        toast.success("Notification envoyée");
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Button variant="outline" disabled>
        <CheckCircle2 className="h-4 w-4 mr-2 text-success" />
        Notification envoyée
      </Button>
    );
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Send className="h-4 w-4 mr-2" />
      )}
      Demander des documents
    </Button>
  );
}
