import { describe, expect, it } from "vitest";
import { decryptCredential, encryptCredential } from "./crypto";

describe("Credential Encryption (AES-256-GCM)", () => {
  const testKey = "test-encryption-key-with-at-least-32-chars-length";

  it("encrypts and decrypts a password cleanly", () => {
    const password = "SuperSecretPassword@1234!";
    const encrypted = encryptCredential(password, testKey);

    expect(encrypted).not.toBe(password);
    expect(encrypted.split(":")).toHaveLength(3); // iv:tag:data

    const decrypted = decryptCredential(encrypted, testKey);
    expect(decrypted).toBe(password);
  });

  it("produces different ciphertexts for the same plaintext due to random IV", () => {
    const password = "SamePassword123";
    const enc1 = encryptCredential(password, testKey);
    const enc2 = encryptCredential(password, testKey);

    expect(enc1).not.toBe(enc2);
    expect(decryptCredential(enc1, testKey)).toBe(password);
    expect(decryptCredential(enc2, testKey)).toBe(password);
  });

  it("fails to decrypt if the wrong key is provided", () => {
    const password = "ConfidentialData";
    const encrypted = encryptCredential(password, testKey);
    const wrongKey = "different-key-that-does-not-match-at-all-32chars";

    expect(() => decryptCredential(encrypted, wrongKey)).toThrow();
  });

  it("fails to decrypt if the ciphertext has been tampered with", () => {
    const password = "TamperDetectionTest";
    const encrypted = encryptCredential(password, testKey);
    const parts = encrypted.split(":");
    // Tamper with the encrypted payload
    parts[2] = parts[2].substring(0, parts[2].length - 2) + "ff";
    const tampered = parts.join(":");

    expect(() => decryptCredential(tampered, testKey)).toThrow();
  });
});
