import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

/**
 * Chiffrement au repos des secrets clients (mots de passe gouvernementaux/bancaires, NAS).
 * AES-256-GCM. Format stocké : `enc:v1:<iv>:<tag>:<ciphertext>` (tous en base64).
 *
 * Clé : variable d'environnement ENCRYPTION_KEY (idéalement 32 octets en base64 ou hex).
 * Toute chaîne est acceptée et dérivée en clé 256 bits via SHA-256 — mais privilégier
 * une vraie clé aléatoire : `openssl rand -base64 32`.
 *
 * Conçu pour être tolérant : decryptSecret() renvoie la valeur telle quelle si elle n'est
 * pas au format chiffré (rétrocompatibilité avec d'éventuelles valeurs en clair).
 */

const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY manquante : impossible de (dé)chiffrer les secrets clients. " +
        "Générer avec `openssl rand -base64 32` et la définir dans l'environnement."
    );
  }
  // Dérivation déterministe en 32 octets, quelle que soit la forme de la clé fournie.
  return createHash("sha256").update(raw, "utf8").digest();
}

/** Chiffre une valeur. Renvoie null/undefined inchangés et ignore les chaînes vides. */
export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null) return null;
  const value = String(plain);
  if (value === "") return null;
  if (value.startsWith(PREFIX)) return value; // déjà chiffré, idempotent

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

/** Déchiffre. Renvoie la valeur telle quelle si elle n'est pas au format chiffré. */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (stored == null) return null;
  const value = String(stored);
  if (!value.startsWith(PREFIX)) return value; // valeur en clair (legacy) — on la rend telle quelle

  try {
    const [ivB64, tagB64, ctB64] = value.slice(PREFIX.length).split(":");
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const ct = Buffer.from(ctB64, "base64");
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    // Clé incorrecte ou donnée corrompue : ne pas faire planter la lecture de toute la fiche.
    return null;
  }
}

/** Champs secrets de `companies` à (dé)chiffrer de façon transparente. */
export const COMPANY_SECRET_FIELDS = [
  "bankPassword",
  "clicsequrPassword",
  "clicsequrExpressPassword",
  "arcPassword",
  "cnesstPassword",
  "reqPassword",
  "serviceCanadaPassword",
  "representativeSin",
] as const;

type SecretField = (typeof COMPANY_SECRET_FIELDS)[number];

/** Chiffre en place les champs secrets d'un objet société (avant écriture en base). */
export function encryptCompanySecrets<T extends Partial<Record<SecretField, unknown>>>(data: T): T {
  const out = { ...data };
  for (const f of COMPANY_SECRET_FIELDS) {
    if (f in out && out[f] != null) {
      (out as Record<string, unknown>)[f] = encryptSecret(out[f] as string);
    }
  }
  return out;
}

/** Déchiffre en place les champs secrets d'une société (après lecture en base). */
export function decryptCompanySecrets<T extends Partial<Record<SecretField, unknown>>>(row: T): T {
  const out = { ...row };
  for (const f of COMPANY_SECRET_FIELDS) {
    if (f in out && out[f] != null) {
      (out as Record<string, unknown>)[f] = decryptSecret(out[f] as string);
    }
  }
  return out;
}
