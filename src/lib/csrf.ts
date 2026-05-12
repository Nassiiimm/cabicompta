import { NextRequest } from "next/server";

/**
 * Valide l'en-tête Origin pour protéger contre les attaques CSRF.
 * À appeler sur toutes les mutations (POST, PUT, DELETE).
 *
 * Stratégie : double-submit origin check.
 * Les navigateurs envoient toujours Origin sur les requêtes cross-origin.
 * Un attaquant ne peut pas forger un Origin correspondant au domaine cible.
 *
 * En développement, localhost est toujours autorisé.
 */
export function validateCsrfOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // Les requêtes sans Origin viennent généralement de curl/Postman/server-side
  // — on les autorise (elles ne peuvent pas porter de cookies cross-origin)
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;

    // Même host = même origine → OK
    if (originHost === host) return true;

    // Localhost toujours autorisé en dev
    if (
      originHost === "localhost" ||
      originHost.startsWith("localhost:") ||
      originHost === "127.0.0.1" ||
      originHost.startsWith("127.0.0.1:")
    ) {
      return process.env.NODE_ENV !== "production";
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Lance une Response 403 si l'Origin est invalide.
 * Utilisation : const err = csrfGuard(request); if (err) return err;
 */
export function csrfGuard(request: NextRequest): Response | null {
  if (!validateCsrfOrigin(request)) {
    return Response.json({ error: "Requête non autorisée (CSRF)" }, { status: 403 });
  }
  return null;
}
