"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur lors de la mise a jour");
        return;
      }

      setSuccess(true);
      (e.target as HTMLFormElement).reset();
    } catch {
      setError("Erreur reseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && (
        <p className="text-xs text-green-700 dark:text-green-400">
          Mot de passe mis a jour avec succes.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="pw-new" className="text-xs">
            Nouveau mot de passe
          </Label>
          <Input
            id="pw-new"
            name="password"
            type="password"
            placeholder="8 caracteres minimum"
            minLength={8}
            required
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pw-confirm" className="text-xs">
            Confirmer le mot de passe
          </Label>
          <Input
            id="pw-confirm"
            name="confirm"
            type="password"
            placeholder="Confirmer"
            minLength={8}
            required
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Mise a jour..." : "Changer le mot de passe"}
      </Button>
    </form>
  );
}
