"use client";

import { useEffect, useRef } from "react";

const HEARTBEAT_MS = 60_000; // ping toutes les 60 s
const IDLE_MS = 5 * 60_000; // inactif après 5 min sans interaction

/**
 * Comptabilise automatiquement le temps de présence ACTIVE sur l'app.
 * Garde-fous : ne compte que si l'onglet est visible ET l'utilisateur a
 * interagi dans les 5 dernières minutes (sinon un onglet laissé ouvert
 * compterait des heures fantômes). Rendu invisible (monté dans le layout).
 */
export function ActivityTracker() {
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const bump = () => {
      lastActivity.current = Date.now();
    };
    const events = ["pointermove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const send = () => {
      const active = Date.now() - lastActivity.current < IDLE_MS;
      if (document.visibilityState === "visible" && active) {
        fetch("/api/activity/heartbeat", { method: "POST", keepalive: true }).catch(() => {});
      }
    };

    send(); // ping initial à l'ouverture
    const id = setInterval(send, HEARTBEAT_MS);

    return () => {
      clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, []);

  return null;
}
