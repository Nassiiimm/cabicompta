"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Notice de transparence Loi 25 — informe l'employé que son temps de présence
 * ACTIVE sur l'application est mesuré (à des fins de gestion et de facturation),
 * avant qu'il continue. Affichée une seule fois : l'acquittement est horodaté
 * en base (auditable). Bloquante tant qu'elle n'est pas acquittée.
 */
export function PresenceNotice({ acked }: { acked: boolean }) {
  const [visible, setVisible] = useState(!acked);
  const [saving, setSaving] = useState(false);

  if (!visible) return null;

  async function acknowledge() {
    setSaving(true);
    try {
      const res = await fetch("/api/activity/acknowledge-notice", { method: "POST" });
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
        <h2 className="text-base font-semibold">Information sur la mesure de présence</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Pour le suivi des heures et la facturation, cette application mesure
            automatiquement votre <strong>temps de présence active</strong> (lorsque
            l&apos;onglet est ouvert et que vous interagissez).
          </p>
          <p>
            <strong>Ce qui est collecté :</strong> la durée active par jour. Aucune
            saisie, page consultée ou frappe clavier n&apos;est enregistrée.
          </p>
          <p>
            <strong>Qui y a accès :</strong> la direction du cabinet, à des fins de
            gestion interne uniquement.
          </p>
          <p>
            Conformément à la Loi 25, vous pouvez consulter ou faire corriger ces
            renseignements auprès de votre responsable.
          </p>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={acknowledge} disabled={saving}>
            {saving ? "Enregistrement…" : "J'ai compris"}
          </Button>
        </div>
      </div>
    </div>
  );
}
