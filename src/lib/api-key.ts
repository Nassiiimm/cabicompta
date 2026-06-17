import { createHash, randomBytes } from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";

/**
 * Clés API d'ingestion. La clé en clair n'existe qu'au moment de la génération ;
 * en base on ne garde que son SHA-256. Format : `cck_<32 octets base64url>`.
 */

const PREFIX = "cck_";

export function generateApiKey(): { plain: string; hash: string; prefix: string } {
  const plain = PREFIX + randomBytes(32).toString("base64url");
  return { plain, hash: hashApiKey(plain), prefix: plain.slice(0, 12) };
}

export function hashApiKey(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

export type ApiKeyContext = { cabinetId: string; createdBy: string; keyId: string };

/**
 * Authentifie une requête via l'en-tête `Authorization: Bearer <clé>`.
 * Renvoie le contexte (cabinet) si la clé est valide, non révoquée et a le scope requis.
 * Lève une Error("Unauthorized" | "Forbidden") sinon.
 */
export async function requireApiKey(
  request: Request,
  requiredScope = "ingest"
): Promise<ApiKeyContext> {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("Unauthorized");

  const hash = hashApiKey(match[1].trim());
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!row) throw new Error("Unauthorized");
  if (row.scope !== requiredScope) throw new Error("Forbidden");

  // last_used_at en fire-and-forget : ne bloque jamais la requête
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .then(() => {}, () => {});

  return { cabinetId: row.cabinetId, createdBy: row.createdBy, keyId: row.id };
}
