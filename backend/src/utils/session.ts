import crypto from "crypto"

/**
 * Generates a cryptographically strong random token for the client cookie.
 */
export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Computes the SHA-256 hash of a raw token for database storage and lookup.
 * Plain-text session tokens are NEVER stored in PostgreSQL.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex")
}
