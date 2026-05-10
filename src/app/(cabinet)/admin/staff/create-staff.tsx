"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X, Copy, Check } from "lucide-react";

export function CreateStaffForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tempPassword: string;
    message: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password"),
      role: fd.get("role"),
    };

    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setResult(data);
    } catch {
      setError("Erreur reseau");
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
        Creer un comptable
      </Button>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Creer un membre de l&apos;equipe</h3>
        <button
          onClick={() => {
            setOpen(false);
            setResult(null);
            setError("");
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {result ? (
        <div className="space-y-2">
          <p className="text-sm text-green-700 dark:text-green-400">
            {result.message}
          </p>
          {result.tempPassword && (
            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
              <code className="text-xs flex-1 select-all">
                {result.tempPassword}
              </code>
              <button
                onClick={copyPassword}
                className="text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <Check className="size-3.5 text-green-600" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Communiquez ces identifiants au nouveau membre.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setResult(null);
              window.location.reload();
            }}
          >
            Fermer
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="staff-name" className="text-xs">
                Nom
              </Label>
              <Input
                id="staff-name"
                name="name"
                placeholder="Marie Dupont"
                required
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="staff-email" className="text-xs">
                Courriel
              </Label>
              <Input
                id="staff-email"
                name="email"
                type="email"
                placeholder="marie@cabinet.ca"
                required
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="staff-password" className="text-xs">
                Mot de passe
              </Label>
              <Input
                id="staff-password"
                name="password"
                type="password"
                placeholder="8 caracteres minimum"
                minLength={8}
                required
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="staff-role" className="text-xs">
                Role
              </Label>
              <select
                id="staff-role"
                name="role"
                defaultValue="STAFF"
                className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="STAFF">Comptable</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </div>
          </div>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Creation..." : "Creer le compte"}
          </Button>
        </form>
      )}
    </div>
  );
}
