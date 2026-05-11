"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function InviteClientButton({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tempPassword: string; message: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body = {
      email: fd.get("email"),
      name: fd.get("name"),
      phone: fd.get("phone") || undefined,
    };

    try {
      const res = await fetch(`/api/clients/${companyId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      if (data.tempPassword) {
        setResult(data);
        toast.success("Compte client créé");
      } else {
        setResult({ tempPassword: "", message: "Utilisateur existant associé à la société." });
        toast.success("Compte client créé");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  function copyPassword() {
    if (result?.tempPassword) {
      navigator.clipboard.writeText(result.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="size-3.5 mr-1.5" />
        Inviter un client
      </Button>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Créer un accès client</h3>
        <button onClick={() => { setOpen(false); setResult(null); setError(""); }} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      {result ? (
        <div className="space-y-2">
          <p className="text-sm text-green-700 dark:text-green-400">{result.message}</p>
          {result.tempPassword && (
            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
              <code className="text-xs flex-1 select-all">{result.tempPassword}</code>
              <button onClick={copyPassword} className="text-muted-foreground hover:text-foreground">
                {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Communiquez ce mot de passe temporaire au client.</p>
          <Button size="sm" variant="outline" onClick={() => { setOpen(false); setResult(null); window.location.reload(); }}>
            Fermer
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="inv-name" className="text-xs">Nom</Label>
              <Input id="inv-name" name="name" placeholder="Jean Tremblay" required className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-email" className="text-xs">Courriel</Label>
              <Input id="inv-email" name="email" type="email" placeholder="jean@entreprise.ca" required className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv-phone" className="text-xs">Téléphone (optionnel)</Label>
            <Input id="inv-phone" name="phone" placeholder="514-555-0000" className="h-8 text-sm" />
          </div>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Création..." : "Créer le compte"}
          </Button>
        </form>
      )}
    </div>
  );
}
