"use client";

import { AlertCircle } from "lucide-react";

export default function PortalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center max-w-2xl mx-auto">
      <AlertCircle className="size-10 text-destructive mb-4" />
      <h2 className="text-lg font-semibold mb-1">Une erreur est survenue</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Un problème inattendu s&apos;est produit. Veuillez réessayer.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
      >
        Réessayer
      </button>
    </div>
  );
}
