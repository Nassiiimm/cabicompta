"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteClientButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le client "${clientName}" ? Cette action est irreversible.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Erreur lors de la suppression");
      }

      router.push("/clients");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4 mr-2" />
      )}
      Supprimer
    </Button>
  );
}
