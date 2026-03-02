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

const SPKI_PREFIX = Buffer.from("302a300506032b656e032100", "hex");

const RAW_KEY_LENGTH = 32;
const NONCE_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PROTOCOL_PREFIX = "encrypted:";
const ENCRYPTION_VERSION = "v1";
const HKDF_INFO = Buffer.from("dotenv-gad:v1");
const HKDF_SALT = Buffer.alloc(0); 
const AAD_PREFIX = "dotenv-gad:v1:";


const PRIVATE_KEY_HEX_LENGTH = 96; 
const PUBLIC_KEY_HEX_LENGTH = 88;  

export interface KeyPair {
  /** Hex-encoded 44-byte SPKI DER. Store as ENVGAD_PUBLIC_KEY in .env (safe to commit). */
  publicKeyHex: string;
  /** Hex-encoded 48-byte PKCS8 DER. Store as ENVGAD_PRIVATE_KEY in .env.keys (never commit). */
  privateKeyHex: string;
}


/**
 * Generates a new key pair using the X25519 curve.
 *
 * @returns An object containing the hex-encoded public and private keys.
 * The public key is safe to commit to version control (e.g. .env), while the private key
 * should be kept secret and stored securely (e.g. .env.keys).
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
 * Encrypts a plaintext string using ChaCha20-Poly1305 authenticated encryption.
 * The encryption key is derived from the shared secret of the ephemeral key pair
 * and the recipient's public key using HKDF-SHA256.
 *
 * @param plaintext - The plaintext string to encrypt.
 * @param recipientPublicKeyHex - Hex-encoded 44-byte SPKI DER of the recipient's public key.
 * @param varName - The name of the environment variable being encrypted.
 * @returns A wire-format string containing the encrypted ciphertext and
 *   ephemeral public key information: `encrypted:v1:<base64>`.
 */

export function encryptEnvValue(
  plaintext: string,
  recipientPublicKeyHex: string,
  varName: string
): string {
  if (!/^[a-fA-F0-9]+$/.test(recipientPublicKeyHex) || recipientPublicKeyHex.length !== PUBLIC_KEY_HEX_LENGTH) {
    throw new Error(
      `Invalid ENVGAD_PUBLIC_KEY format (expected ${PUBLIC_KEY_HEX_LENGTH}-char hex-encoded SPKI DER, got ${recipientPublicKeyHex.length} chars)`
    );
  }

  const recipientSpki = Buffer.from(recipientPublicKeyHex, "hex");

  const { publicKeyHex: ephPubHex, privateKeyHex: ephPrivHex } = generateKeyPair();
  const ephSpki = Buffer.from(ephPubHex, "hex");
  const ephPkcs8 = Buffer.from(ephPrivHex, "hex");

  const sharedSecret = diffieHellman({
    privateKey: createPrivateKey({ key: ephPkcs8, format: "der", type: "pkcs8" }),
    publicKey: createPublicKey({ key: recipientSpki, format: "der", type: "spki" }),
  });

  const encKey = Buffer.from(
    hkdfSync("sha256", sharedSecret, HKDF_SALT, HKDF_INFO, 32)
  );

  const nonce = randomBytes(NONCE_LENGTH);

  const cipher = createCipheriv(
    "chacha20-poly1305",
    encKey,
    nonce,
    { authTagLength: AUTH_TAG_LENGTH } as Parameters<typeof createCipheriv>[3]
  ) as unknown as CipherGCM;

  cipher.setAAD(Buffer.from(`${AAD_PREFIX}${varName}`));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const rawEphPubKey = ephSpki.subarray(SPKI_PREFIX.length);

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

  const rawEphPubKey = payload.subarray(0, RAW_KEY_LENGTH);
  const nonce = payload.subarray(RAW_KEY_LENGTH, RAW_KEY_LENGTH + NONCE_LENGTH);
  const rest = payload.subarray(RAW_KEY_LENGTH + NONCE_LENGTH);
  const authTag = rest.subarray(rest.length - AUTH_TAG_LENGTH);
  const ciphertext = rest.subarray(0, rest.length - AUTH_TAG_LENGTH);

  const ephSpki = Buffer.concat([SPKI_PREFIX, rawEphPubKey]);

  // ECDH: recipient private × ephemeral public → shared secret
  const pkcs8 = Buffer.from(privateKeyHex, "hex");
  const sharedSecret = diffieHellman({
    privateKey: createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" }),
    publicKey: createPublicKey({ key: ephSpki, format: "der", type: "spki" }),
  });

  // HKDF-SHA256: same derivation as encryption
  const encKey = Buffer.from(
    hkdfSync("sha256", sharedSecret, HKDF_SALT, HKDF_INFO, 32)
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
 * Returns true if the given value starts with the encrypted value
 * prefix, and false otherwise.
 *
 * The encrypted value prefix is in the format of
 * `encrypted:v1:<base64-encoded-payload>`.
 *
 * @param {string} value the value to check
 * @returns {boolean} true if the value is an encrypted value, false otherwise
 */
export function isEncryptedValue(value: string): boolean {
  return value.startsWith(`${PROTOCOL_PREFIX}${ENCRYPTION_VERSION}:`);
}


/**
 * Loads the ENVGAD_PRIVATE_KEY value from the given path (default: `.env.keys`)
 * or the ENVGAD_PRIVATE_KEY environment variable if present.
 * Returns the hex-encoded DER value of the private key if found, or null otherwise.
 * @param {Object} [options] Optional options.
 * @param {string} [options.keysPath] Path to the `.env.keys` file (default: `.env.keys`).
 * @returns {string | null} Hex-encoded DER value of the private key if found, or null otherwise.
 */
export function loadPrivateKey(options: { keysPath?: string } = {}): string | null {
  const keysPath = options.keysPath ?? ".env.keys";

  if (existsSync(keysPath)) {
    const content = readFileSync(keysPath, "utf8");
    const match = content.match(/^ENVGAD_PRIVATE_KEY=([a-fA-F0-9]+)/m);
    if (match) {
      const key = match[1];
      if (key.length !== PRIVATE_KEY_HEX_LENGTH) {
        throw new Error(
          `Invalid ENVGAD_PRIVATE_KEY in ${keysPath}: expected ${PRIVATE_KEY_HEX_LENGTH}-char hex-encoded PKCS8 DER, got ${key.length} chars`
        );
      }
      return key;
    }
  }

  const envKey = process.env.ENVGAD_PRIVATE_KEY;
  if (envKey) {
    if (!/^[a-fA-F0-9]+$/.test(envKey) || envKey.length !== PRIVATE_KEY_HEX_LENGTH) {
      throw new Error(
        `Invalid ENVGAD_PRIVATE_KEY format (expected ${PRIVATE_KEY_HEX_LENGTH}-char hex-encoded PKCS8 DER, got ${envKey.length} chars)`
      );
    }
    return envKey;
  }

  return null;
}