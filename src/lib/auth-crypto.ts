import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Checks if a string has the standard bcrypt format ($2a$, $2b$, or $2y$)
 */
export function isBcryptHash(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

/**
 * Hashes a plaintext password or PIN using bcrypt
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plain, salt);
}

/**
 * Verifies a plaintext input against either:
 * 1. A bcrypt hash (industry standard)
 * 2. A legacy plaintext password/PIN (backward compatibility)
 * 
 * Returns { valid: boolean, needsRehash: boolean }
 */
export async function verifyAndCheckRehash(
  plainInput: string,
  storedHashOrPlain: string | null | undefined
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!storedHashOrPlain) {
    return { valid: false, needsRehash: false };
  }

  // If already a bcrypt hash, compare via bcrypt
  if (isBcryptHash(storedHashOrPlain)) {
    const valid = await bcrypt.compare(plainInput, storedHashOrPlain);
    return { valid, needsRehash: false };
  }

  // Legacy plaintext support (e.g. 'admin', 'admin123', '1234')
  // Allows legacy passwords or admin alias ('admin' matching 'admin123')
  const legacyMatches =
    plainInput === storedHashOrPlain ||
    (plainInput === "admin" && storedHashOrPlain === "admin123") ||
    (plainInput === "admin123" && storedHashOrPlain === "admin");

  if (legacyMatches) {
    return { valid: true, needsRehash: true };
  }

  return { valid: false, needsRehash: false };
}
