// Outils d'extraction JSON robustes pour les réponses LLM (portés de FiscalAuto).
// Les modèles entourent parfois le JSON de texte/backticks, ou tronquent une longue
// réponse : on récupère malgré tout le maximum d'objets complets.

/** Arrondi monétaire à 2 décimales (0 si non numérique). */
export const round2 = (n: unknown): number => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Répare un JSON tronqué : garde jusqu'au dernier objet complet puis referme
 * les tableaux/objets restés ouverts. Renvoie null si irrécupérable.
 */
function repairTruncatedJson(t: string): unknown {
  const end = t.lastIndexOf("}");
  if (end === -1) return null;
  const s = t.slice(0, end + 1);
  let inStr = false, esc = false, curly = 0, square = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") curly++;
    else if (c === "}") curly--;
    else if (c === "[") square++;
    else if (c === "]") square--;
  }
  const repaired = s + "]".repeat(Math.max(0, square)) + "}".repeat(Math.max(0, curly));
  try { return JSON.parse(repaired); } catch { return null; }
}

/**
 * Extrait un objet JSON d'une réponse LLM, même entourée de texte/backticks
 * ou tronquée. Lève une Error si totalement illisible.
 */
export function extractJson(text: string): Record<string, unknown> {
  let t = (text || "").trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  if (start !== -1) t = t.slice(start);
  const end = t.lastIndexOf("}");
  const candidate = end !== -1 ? t.slice(0, end + 1) : t;
  try { return JSON.parse(candidate) as Record<string, unknown>; } catch { /* probablement tronqué */ }
  const repaired = repairTruncatedJson(t);
  if (repaired && typeof repaired === "object") return repaired as Record<string, unknown>;
  throw new Error("Réponse IA illisible (probablement tronquée).");
}
