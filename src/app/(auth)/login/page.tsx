"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Identifiants invalides");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const { role } = await res.json();
      router.push(role === "CLIENT" ? "/portal" : "/dashboard");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-base font-semibold tracking-tight">CabiCompta</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <Link href="/reset-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Oublié ?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Pas de compte ?{" "}
          <Link href="/register" className="text-foreground underline underline-offset-4 hover:text-foreground/80">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
