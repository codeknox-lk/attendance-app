import { describe, it, expect } from "vitest";
import { hashPassword, verifyAndCheckRehash, isBcryptHash } from "../auth-crypto";

describe("Cryptographic Authentication & Zero-Downtime Migration", () => {
  it("generates valid bcrypt hashes with salt prefixes", async () => {
    const plain = "DoctorSecret2026!";
    const hashed = await hashPassword(plain);

    expect(isBcryptHash(hashed)).toBe(true);
    expect(hashed).not.toBe(plain);
  });

  it("verifies matching passwords against bcrypt hashes and confirms no rehash needed", async () => {
    const password = "ClinicAdminSecurePass123";
    const hashed = await hashPassword(password);

    const result = await verifyAndCheckRehash(password, hashed);
    expect(result.valid).toBe(true);
    expect(result.needsRehash).toBe(false);
  });

  it("rejects incorrect passwords against bcrypt hashes", async () => {
    const correctPassword = "CorrectPassword123";
    const wrongPassword = "WrongPassword999";
    const hashed = await hashPassword(correctPassword);

    const result = await verifyAndCheckRehash(wrongPassword, hashed);
    expect(result.valid).toBe(false);
    expect(result.needsRehash).toBe(false);
  });

  it("recognizes legacy plaintext passwords and flags them for auto-migration (rehash)", async () => {
    const legacyPlaintext = "admin123";

    const result = await verifyAndCheckRehash("admin123", legacyPlaintext);
    expect(result.valid).toBe(true);
    expect(result.needsRehash).toBe(true);
  });

  it("supports default admin aliases ('admin' matching 'admin123') and flags for rehash", async () => {
    const legacyDbPassword = "admin123";

    const result = await verifyAndCheckRehash("admin", legacyDbPassword);
    expect(result.valid).toBe(true);
    expect(result.needsRehash).toBe(true);
  });

  it("rejects completely incorrect legacy plaintext attempts", async () => {
    const legacyDbPassword = "admin123";

    const result = await verifyAndCheckRehash("completelyWrong", legacyDbPassword);
    expect(result.valid).toBe(false);
  });
});
