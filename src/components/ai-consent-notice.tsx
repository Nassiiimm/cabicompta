"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Consentement du client à l'analyse de ses documents par l'IA (OCR/classement
 * via Claude). Exigé par le mandat du cabinet et la Loi 25. Affiché une seule
 * fois sur le portail client ; le consentement est horodaté en base (auditable).
 */
export function AiConsentNotice({ acked }: { acked: boolean }) {
  const [visible, setVisible] = useState(!acked);
  const [saving, setSaving] = useState(false);

  if (!visible) return null;

  async function accept() {
    setSaving(true);
    try {
      const res = await fetch("/api/portal/ai-consent", { method: "POST" });
      if (res.ok) {
        setVisible(false);
      } else {
        setSaving(false);
      }
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
        <h2 className="text-base font-semibold">Analyse de vos documents par l&apos;IA</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Pour accélérer le traitement, les documents que vous déposez sont
            analysés par une <strong>intelligence artificielle</strong> (lecture
            et classement automatiques).
          </p>
          <p>
            <strong>Garanties :</strong> vos documents ne servent jamais à
            entraîner l&apos;IA, restent hébergés au Canada, et{" "}
            <strong>aucune décision fiscale n&apos;est prise sans validation par
            votre comptable</strong>.
          </p>
          <p>
            En continuant, vous consentez à ce traitement. Vous pouvez le retirer
            à tout moment en contactant le cabinet.
          </p>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={accept} disabled={saving}>
            {saving ? "Enregistrement…" : "J'accepte"}
          </Button>
        </div>
      </div>
    </div>
  );
}
