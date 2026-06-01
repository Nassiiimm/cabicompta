"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = "loading" | "disabled" | "enrolling" | "enabled";

/**
 * Authentification à deux facteurs (TOTP) via Supabase MFA — opt-in.
 * L'utilisateur scanne un QR code avec son app d'authentification puis confirme
 * un code à 6 chiffres. Aucun service tiers. N'impacte que ceux qui l'activent.
 */
export function MfaSetup() {
  const supabase = createClient();
  const [status, setStatus] = useState<Status>("loading");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setError("Impossible de charger l'état 2FA.");
      setStatus("disabled");
      return;
    }
    const verified = data.totp.find((f) => f.status === "verified");
    setStatus(verified ? "enabled" : "disabled");
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function startEnroll() {
    setError("");
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `CFC ${Date.now()}`,
      });
      if (error || !data) {
        setError("Échec de l'activation. Réessayez.");
        return;
      }
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStatus("enrolling");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError("");
    setBusy(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr || !ch) {
        setError("Échec du défi. Réessayez.");
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (vErr) {
        setError("Code invalide. Vérifiez l'heure de votre téléphone et réessayez.");
        return;
      }
      setCode("");
      setQr("");
      setSecret("");
      setStatus("enabled");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setError("");
    setBusy(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      for (const f of data?.totp ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      setStatus("disabled");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  if (status === "enabled") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-green-700 dark:text-green-400">
          ✓ La 2FA est active sur votre compte.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button size="sm" variant="outline" onClick={disable} disabled={busy}>
          {busy ? "…" : "Désactiver la 2FA"}
        </Button>
      </div>
    );
  }

  if (status === "enrolling") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Scannez ce code avec votre application d&apos;authentification (Google
          Authenticator, Authy, etc.) puis entrez le code à 6 chiffres.
        </p>
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR code 2FA" className="h-44 w-44 rounded-md border bg-white p-2" />
        )}
        {secret && (
          <p className="text-xs text-muted-foreground">
            Clé manuelle : <code className="font-mono">{secret}</code>
          </p>
        )}
        <div className="space-y-1">
          <Label htmlFor="mfa-code" className="text-xs">Code à 6 chiffres</Label>
          <Input
            id="mfa-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            className="h-8 w-32 text-sm"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={confirm} disabled={busy || code.length < 6}>
            {busy ? "…" : "Confirmer"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setStatus("disabled")} disabled={busy}>
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Ajoutez une couche de sécurité : en plus de votre mot de passe, un code
        temporaire généré par votre téléphone sera demandé à la connexion.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button size="sm" onClick={startEnroll} disabled={busy}>
        {busy ? "…" : "Activer la 2FA"}
      </Button>
    </div>
  );
}
