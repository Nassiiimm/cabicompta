"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations("auth.login");
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
      setError(t("error"));
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
    <div className="min-h-screen flex">
      {/* Panneau gauche — identité visuelle */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-950 flex-col items-center justify-center p-12">
        <Image
          src="/logo-cfc-transparent.png"
          alt="CFC — Comptabilité Fiscalité Conseil"
          width={320}
          height={128}
          className="object-contain mb-8"
          priority
        />
        <p className="text-neutral-400 text-sm text-center max-w-xs leading-relaxed">
          Plateforme interne de gestion — accès réservé aux membres de l'équipe CFC.
        </p>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white dark:bg-neutral-950">
        {/* Logo mobile uniquement */}
        <div className="lg:hidden mb-8 bg-neutral-950 rounded-xl px-6 py-4">
          <Image
            src="/logo-cfc-transparent.png"
            alt="CFC"
            width={200}
            height={80}
            className="object-contain"
          />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
            <p className="text-sm text-muted-foreground mt-1">Entrez vos identifiants pour accéder au portail</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/5 border border-destructive/10 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("passwordLabel")}</Label>
                <Link href="/reset-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {t("forgotPassword")}
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
              {loading ? t("submitting") : t("submit")}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
