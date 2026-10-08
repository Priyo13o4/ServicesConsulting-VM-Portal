import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * VM Credential Encryption (AES-256-GCM)
 * Required by AGENTS.md Rule 10 and docs/domain.md.
 * Credentials are stored encrypted at rest and only revealed with audited access.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

function deriveKey(secret?: string): Buffer {
  const keySource = secret || process.env.CREDENTIALS_KEY;
  if (!keySource) {
    throw new Error(
      "Encryption key not configured. Set CREDENTIALS_KEY in environment."
    );
  }
  // Deterministically hash to 32 bytes (256 bits) for AES-256
  return createHash("sha256").update(keySource).digest();
}

/**
 * Encrypts a plaintext credential string using AES-256-GCM
 * Output format: iv:tag:ciphertext (hex-encoded)
 */
export function encryptCredential(plaintext: string, secretKey?: string): string {
  const key = deriveKey(secretKey);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts an encrypted credential string using AES-256-GCM
 * Throws an error if key is wrong, tag mismatch, or tampering detected.
 */
export function decryptCredential(ciphertext: string, secretKey?: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted credential format. Expected iv:tag:ciphertext");
  }

  const [ivHex, tagHex, dataHex] = parts;
  const key = deriveKey(secretKey);
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
