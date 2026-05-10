"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const [step, setStep] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // If we have a code in URL, show update form
  const hasCode = searchParams.get("code");

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setMessage("Si ce courriel existe, un lien de réinitialisation a été envoyé.");
    setLoading(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/reset-password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      setMessage("Mot de passe mis à jour. Redirection...");
      setTimeout(() => router.push("/login"), 2000);
    } else {
      const data = await res.json();
      setError(data.error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-base font-semibold tracking-tight">CabiCompta</span>
        </div>

        {message ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">{message}</p>
            <Link href="/login" className="text-sm text-foreground underline underline-offset-4">
              Retour à la connexion
            </Link>
          </div>
        ) : hasCode ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <h1 className="text-lg font-semibold">Nouveau mot de passe</h1>
            {error && (
              <div className="text-sm text-destructive bg-destructive/5 border border-destructive/10 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmer</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRequest} className="space-y-4">
            <h1 className="text-lg font-semibold">Réinitialiser le mot de passe</h1>
            <p className="text-sm text-muted-foreground">
              Entrez votre courriel pour recevoir un lien de réinitialisation.
            </p>
            {error && (
              <div className="text-sm text-destructive bg-destructive/5 border border-destructive/10 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Courriel</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@cabinet.ca"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Envoi..." : "Envoyer le lien"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-foreground underline underline-offset-4">
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
