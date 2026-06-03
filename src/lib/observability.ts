/**
 * Capture d'erreur structurée — logs JSON exploitables dans les logs Vercel
 * (recherche/filtrage), et point de branchement unique pour un service externe
 * (Sentry…) le jour où un DSN est configuré.
 *
 * À utiliser dans les catch des chemins NON SURVEILLÉS (crons, webhooks) où une
 * erreur passerait sinon inaperçue.
 */
export function captureError(error: unknown, context: Record<string, unknown> = {}): void {
  const payload = {
    level: "error",
    ts: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };
  console.error("[ERROR]", JSON.stringify(payload));

  // Activation future : si process.env.SENTRY_DSN est défini, forward ici
  // (Sentry.captureException) — nécessite un compte Sentry + le SDK.
}
