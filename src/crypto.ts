import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import type { CipherGCM, DecipherGCM } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { DecryptionFailedError } from "./errors.js";

// X25519 SPKI DER prefix (12 bytes) that precedes the raw 32-byte public key.
// Breakdown: SEQUENCE(42) + SEQUENCE(5) + OID(id-X25519=1.3.101.110) + BIT STRING header
const SPKI_PREFIX = Buffer.from("302a300506032b656e032100", "hex");

const RAW_KEY_LENGTH = 32;
const NONCE_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PROTOCOL_PREFIX = "encrypted:";
const ENCRYPTION_VERSION = "v1";
const HKDF_INFO = Buffer.from("dotenv-gad:v1");
const AAD_PREFIX = "dotenv-gad:v1:";

export interface KeyPair {
  /** Hex-encoded 44-byte SPKI DER. Store as ENVGAD_PUBLIC_KEY in .env (safe to commit). */
  publicKeyHex: string;
  /** Hex-encoded 48-byte PKCS8 DER. Store as ENVGAD_PRIVATE_KEY in .env.keys (never commit). */
  privateKeyHex: string;
}

/**
 * Generate a fresh X25519 key pair for encryption/decryption.
 * Returns hex-encoded DER buffers that can be written directly to .env and .env.keys.
 */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("x25519", {
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  });
  return {
    publicKeyHex: (publicKey as Buffer).toString("hex"),
    privateKeyHex: (privateKey as Buffer).toString("hex"),
  };
}

/**
 * Encrypt a plaintext value using ECIES (X25519 + HKDF-SHA256 + ChaCha20-Poly1305).
 *
 * @param plaintext - Raw string value to encrypt.
 * @param recipientPublicKeyHex - Hex-encoded SPKI DER of the recipient's public key (from DOTENV_PUBLIC_KEY).
 * @param varName - Schema variable name, used as AAD to prevent field-swapping attacks.
 * @returns Wire-format ciphertext string: `encrypted:v1:<base64>`.
 */
export function encryptEnvValue(
  plaintext: string,
  recipientPublicKeyHex: string,
  varName: string
): string {
  const recipientSpki = Buffer.from(recipientPublicKeyHex, "hex");

  // Ephemeral key pair — new for every encryption call (forward secrecy, non-deterministic)
  const { publicKeyHex: ephPubHex, privateKeyHex: ephPrivHex } = generateKeyPair();
  const ephSpki = Buffer.from(ephPubHex, "hex");
  const ephPkcs8 = Buffer.from(ephPrivHex, "hex");

  // ECDH: ephemeral private × recipient public → shared secret
  const sharedSecret = diffieHellman({
    privateKey: createPrivateKey({ key: ephPkcs8, format: "der", type: "pkcs8" }),
    publicKey: createPublicKey({ key: recipientSpki, format: "der", type: "spki" }),
  });

  // HKDF-SHA256: shared secret → 32-byte ChaCha20 key
  const encKey = Buffer.from(
    hkdfSync("sha256", sharedSecret, Buffer.alloc(0), HKDF_INFO, 32)
  );

  const nonce = randomBytes(NONCE_LENGTH);

  // ChaCha20-Poly1305 authenticated encryption
  const cipher = createCipheriv(
    "chacha20-poly1305",
    encKey,
    nonce,
    { authTagLength: AUTH_TAG_LENGTH } as Parameters<typeof createCipheriv>[3]
  ) as unknown as CipherGCM;

  cipher.setAAD(Buffer.from(`${AAD_PREFIX}${varName}`));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Extract compact 32-byte raw public key from 44-byte SPKI DER (SPKI_PREFIX is 12 bytes)
  const rawEphPubKey = ephSpki.subarray(SPKI_PREFIX.length);

  // Wire format: rawEphPubKey[32] + nonce[12] + ciphertext[N] + authTag[16]
  const payload = Buffer.concat([rawEphPubKey, nonce, ciphertext, authTag]);
  return `${PROTOCOL_PREFIX}${ENCRYPTION_VERSION}:${payload.toString("base64")}`;
}

/**
 * Decrypt a wire-format ciphertext produced by {@link encryptEnvValue}.
 *
 * @param token - Wire-format string: `encrypted:v1:<base64>`.
 * @param privateKeyHex - Hex-encoded PKCS8 DER of the recipient's private key (from ENVGAD_PRIVATE_KEY).
 * @param varName - Schema variable name, must match the one used during encryption (AAD check).
 * @returns Decrypted plaintext string.
 * @throws {@link DecryptionFailedError} if the key is wrong, ciphertext is tampered, or AAD mismatches.
 */
export function decryptEnvValue(
  token: string,
  privateKeyHex: string,
  varName: string
): string {
  const prefix = `${PROTOCOL_PREFIX}${ENCRYPTION_VERSION}:`;

  if (!token.startsWith(prefix)) {
    const versionMatch = token.match(/^encrypted:(\w+):/);
    if (versionMatch) {
      throw new Error(
        `Unsupported encryption version: ${versionMatch[1]}. ` +
          `This version of dotenv-gad supports: ${ENCRYPTION_VERSION}`
      );
    }
    throw new Error("Invalid encrypted value format");
  }

  let payload: Buffer;
  try {
    payload = Buffer.from(token.slice(prefix.length), "base64");
  } catch {
    throw new Error("Invalid base64 encoding in encrypted value");
  }

  const minLength = RAW_KEY_LENGTH + NONCE_LENGTH + AUTH_TAG_LENGTH;
  if (payload.length < minLength) {
    throw new Error(
      `Encrypted value too short: ${payload.length} bytes (minimum: ${minLength})`
    );
  }

  // Split wire payload
  const rawEphPubKey = payload.subarray(0, RAW_KEY_LENGTH);
  const nonce = payload.subarray(RAW_KEY_LENGTH, RAW_KEY_LENGTH + NONCE_LENGTH);
  const rest = payload.subarray(RAW_KEY_LENGTH + NONCE_LENGTH);
  const authTag = rest.subarray(rest.length - AUTH_TAG_LENGTH);
  const ciphertext = rest.subarray(0, rest.length - AUTH_TAG_LENGTH);

  // Reconstruct ephemeral SPKI DER from 32-byte raw key
  const ephSpki = Buffer.concat([SPKI_PREFIX, rawEphPubKey]);

  // ECDH: recipient private × ephemeral public → shared secret
  const pkcs8 = Buffer.from(privateKeyHex, "hex");
  const sharedSecret = diffieHellman({
    privateKey: createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" }),
    publicKey: createPublicKey({ key: ephSpki, format: "der", type: "spki" }),
  });

  // HKDF-SHA256: same derivation as encryption
  const encKey = Buffer.from(
    hkdfSync("sha256", sharedSecret, Buffer.alloc(0), HKDF_INFO, 32)
  );

  const decipher = createDecipheriv(
    "chacha20-poly1305",
    encKey,
    nonce,
    { authTagLength: AUTH_TAG_LENGTH } as Parameters<typeof createDecipheriv>[3]
  ) as unknown as DecipherGCM;

  decipher.setAAD(Buffer.from(`${AAD_PREFIX}${varName}`));
  decipher.setAuthTag(authTag);

  try {
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    throw new DecryptionFailedError(varName);
  }
}

/**
 * Returns true if the value looks like a dotenv-gad encrypted token.
 */
export function isEncryptedValue(value: string): boolean {
  return value.startsWith(`${PROTOCOL_PREFIX}${ENCRYPTION_VERSION}:`);
}

/**
 * Load the private key hex string using the standard resolution order:
 * 1. `.env.keys` file at `keysPath` (default: `.env.keys`)
 * 2. `ENVGAD_PRIVATE_KEY` environment variable
 *
 * @returns Hex string of the PKCS8 DER private key, or `null` if not found.
 */
export function loadPrivateKey(options: { keysPath?: string } = {}): string | null {
  const keysPath = options.keysPath ?? ".env.keys";

  if (existsSync(keysPath)) {
    const content = readFileSync(keysPath, "utf8");
    const match = content.match(/^ENVGAD_PRIVATE_KEY=([a-fA-F0-9]+)/m);
    if (match) return match[1];
  }

  const envKey = process.env.ENVGAD_PRIVATE_KEY;
  if (envKey) {
    if (!/^[a-fA-F0-9]+$/.test(envKey)) {
      throw new Error("Invalid ENVGAD_PRIVATE_KEY format (expected hex-encoded DER)");
    }
    return envKey;
  }

  return null;
}