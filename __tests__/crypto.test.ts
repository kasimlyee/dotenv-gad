import { describe, test, expect } from "vitest";
import {
  generateKeyPair,
  encryptEnvValue,
  decryptEnvValue,
  isEncryptedValue,
  loadPrivateKey,
} from "../src/crypto.js";

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

describe("generateKeyPair", () => {
  test("generates valid hex strings", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    expect(publicKeyHex).toMatch(/^[a-f0-9]+$/i);
    expect(privateKeyHex).toMatch(/^[a-f0-9]+$/i);
  });

  test("public key is 44 bytes (88 hex chars) — X25519 SPKI DER", () => {
    expect(generateKeyPair().publicKeyHex).toHaveLength(88);
  });

  test("private key is 48 bytes (96 hex chars) — X25519 PKCS8 DER", () => {
    expect(generateKeyPair().privateKeyHex).toHaveLength(96);
  });

  test("each call produces a unique key pair", () => {
    const a = generateKeyPair();
    const b = generateKeyPair();
    expect(a.publicKeyHex).not.toBe(b.publicKeyHex);
    expect(a.privateKeyHex).not.toBe(b.privateKeyHex);
  });
});

// ---------------------------------------------------------------------------
// Round-trip encryption / decryption
// ---------------------------------------------------------------------------

describe("encryptEnvValue / decryptEnvValue", () => {
  test("basic ASCII value round-trips correctly", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const ct = encryptEnvValue("hello-world", publicKeyHex, "MY_VAR");
    expect(decryptEnvValue(ct, privateKeyHex, "MY_VAR")).toBe("hello-world");
  });

  test("empty string", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const ct = encryptEnvValue("", publicKeyHex, "EMPTY");
    expect(decryptEnvValue(ct, privateKeyHex, "EMPTY")).toBe("");
  });

  test("unicode / emoji value", () => {
    const plaintext = "münchen-日本語-🔑";
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const ct = encryptEnvValue(plaintext, publicKeyHex, "UNICODE_VAR");
    expect(decryptEnvValue(ct, privateKeyHex, "UNICODE_VAR")).toBe(plaintext);
  });

  test("long value (4 KB)", () => {
    const plaintext = "x".repeat(4096);
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const ct = encryptEnvValue(plaintext, publicKeyHex, "LONG_VAR");
    expect(decryptEnvValue(ct, privateKeyHex, "LONG_VAR")).toBe(plaintext);
  });

  test("database URL with special characters", () => {
    const val = "postgres://user:p@ssw0rd!@localhost:5432/mydb?sslmode=require";
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const ct = encryptEnvValue(val, publicKeyHex, "DATABASE_URL");
    expect(decryptEnvValue(ct, privateKeyHex, "DATABASE_URL")).toBe(val);
  });

  test("encryption is non-deterministic (different ciphertext each call)", () => {
    const { publicKeyHex } = generateKeyPair();
    const ct1 = encryptEnvValue("same-value", publicKeyHex, "VAR");
    const ct2 = encryptEnvValue("same-value", publicKeyHex, "VAR");
    expect(ct1).not.toBe(ct2);
  });

  test("output starts with encrypted:v1: prefix", () => {
    const { publicKeyHex } = generateKeyPair();
    expect(encryptEnvValue("v", publicKeyHex, "V")).toMatch(/^encrypted:v1:/);
  });
});

// ---------------------------------------------------------------------------
// Security properties
// ---------------------------------------------------------------------------

describe("Security: wrong private key", () => {
  test("decryption with a different key pair throws", () => {
    const sender = generateKeyPair();
    const attacker = generateKeyPair();
    const ct = encryptEnvValue("secret", sender.publicKeyHex, "SECRET");
    expect(() => decryptEnvValue(ct, attacker.privateKeyHex, "SECRET")).toThrow();
  });
});

describe("Security: AAD prevents field-swapping", () => {
  test("decrypting DATABASE_URL ciphertext under API_KEY fails (AAD mismatch)", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const ct = encryptEnvValue("postgres://localhost/db", publicKeyHex, "DATABASE_URL");
    expect(() => decryptEnvValue(ct, privateKeyHex, "API_KEY")).toThrow();
  });
});

describe("Security: ciphertext integrity (Poly1305 auth tag)", () => {
  test("flipping a byte in ciphertext body throws", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const ct = encryptEnvValue("sensitive-data", publicKeyHex, "VAR");

    const prefix = "encrypted:v1:";
    const buf = Buffer.from(ct.slice(prefix.length), "base64");
    // Flip a byte well inside the ciphertext region (past 32-byte key + 12-byte nonce)
    buf[32 + 12 + 4] ^= 0xff;
    const tampered = prefix + buf.toString("base64");

    expect(() => decryptEnvValue(tampered, privateKeyHex, "VAR")).toThrow();
  });

  test("truncated payload throws with descriptive error", () => {
    const { privateKeyHex } = generateKeyPair();
    const truncated = "encrypted:v1:" + Buffer.from("tooshort").toString("base64");
    expect(() => decryptEnvValue(truncated, privateKeyHex, "VAR")).toThrow(/too short/i);
  });
});

describe("Error cases", () => {
  test("unsupported version prefix includes version in message", () => {
    const { privateKeyHex } = generateKeyPair();
    expect(() =>
      decryptEnvValue("encrypted:v99:abc", privateKeyHex, "VAR")
    ).toThrow(/v99/);
  });

  test("completely non-encrypted input throws", () => {
    const { privateKeyHex } = generateKeyPair();
    expect(() =>
      decryptEnvValue("plaintext-value", privateKeyHex, "VAR")
    ).toThrow(/Invalid encrypted value format/);
  });
});

// ---------------------------------------------------------------------------
// isEncryptedValue
// ---------------------------------------------------------------------------

describe("isEncryptedValue", () => {
  test("returns true for valid encrypted:v1: token", () => {
    const { publicKeyHex } = generateKeyPair();
    expect(isEncryptedValue(encryptEnvValue("x", publicKeyHex, "V"))).toBe(true);
  });

  test("returns false for plaintext strings", () => {
    expect(isEncryptedValue("plaintext")).toBe(false);
    expect(isEncryptedValue("")).toBe(false);
    expect(isEncryptedValue("postgres://localhost/db")).toBe(false);
  });

  test("returns false for wrong prefix", () => {
    expect(isEncryptedValue("encrypted:v2:abc")).toBe(false);
    expect(isEncryptedValue("enc:v1:abc")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// loadPrivateKey
// ---------------------------------------------------------------------------

describe("loadPrivateKey", () => {
  test("returns null when key file absent and ENVGAD_PRIVATE_KEY not set", () => {
    const original = process.env.ENVGAD_PRIVATE_KEY;
    delete process.env.ENVGAD_PRIVATE_KEY;
    try {
      expect(loadPrivateKey({ keysPath: ".nonexistent-xyz.keys" })).toBeNull();
    } finally {
      if (original !== undefined) process.env.ENVGAD_PRIVATE_KEY = original;
    }
  });

  test("reads key from ENVGAD_PRIVATE_KEY environment variable", () => {
    const { privateKeyHex } = generateKeyPair();
    const original = process.env.ENVGAD_PRIVATE_KEY;
    process.env.ENVGAD_PRIVATE_KEY = privateKeyHex;
    try {
      expect(loadPrivateKey({ keysPath: ".nonexistent-xyz.keys" })).toBe(privateKeyHex);
    } finally {
      if (original !== undefined) {
        process.env.ENVGAD_PRIVATE_KEY = original;
      } else {
        delete process.env.ENVGAD_PRIVATE_KEY;
      }
    }
  });

  test("throws on invalid hex in ENVGAD_PRIVATE_KEY", () => {
    const original = process.env.ENVGAD_PRIVATE_KEY;
    process.env.ENVGAD_PRIVATE_KEY = "not-valid-hex!!";
    try {
      expect(() => loadPrivateKey({ keysPath: ".nonexistent-xyz.keys" })).toThrow(/hex/i);
    } finally {
      if (original !== undefined) {
        process.env.ENVGAD_PRIVATE_KEY = original;
      } else {
        delete process.env.ENVGAD_PRIVATE_KEY;
      }
    }
  });
});
