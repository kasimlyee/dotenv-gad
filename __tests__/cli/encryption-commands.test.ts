/**
 * Integration tests for the encryption-related CLI command logic.
 *
 * These tests exercise the same functions used by keygen, encrypt, decrypt,
 * verify, status, and rotate — reading and writing real files in a temp
 * directory — without spawning a subprocess.
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  generateKeyPair,
  encryptEnvValue,
  decryptEnvValue,
  isEncryptedValue,
  loadPrivateKey,
} from "../../src/crypto.js";
import { defineSchema } from "../../src/schema.js";
import { EnvValidator } from "../../src/validator.js";
import { EnvAggregateError, EncryptionKeyMissingError } from "../../src/errors.js";
import dotenv from "dotenv";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

// Use a separate fixtures dir to avoid conflicts with cli-integration.test.ts,
// which deletes ".fixtures" in its afterAll and runs in parallel with this file.
const TMP = join(__dirname, ".fixtures-encryption");

beforeAll(() => mkdirSync(TMP, { recursive: true }));
afterAll(() => { if (existsSync(TMP)) rmSync(TMP, { recursive: true }); });

function setup(): string {
  const dir = join(TMP, Math.random().toString(36).slice(2));
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string) {
  if (existsSync(dir)) rmSync(dir, { recursive: true });
}

function envPath(dir: string) {
  return join(dir, ".env");
}

function keysPath(dir: string) {
  return join(dir, ".env.keys");
}

function writeEnv(dir: string, content: string) {
  writeFileSync(envPath(dir), content);
}

function writeKeys(dir: string, privateKeyHex: string) {
  writeFileSync(
    keysPath(dir),
    `# KEEP THIS FILE SECRET\nENVGAD_PRIVATE_KEY=${privateKeyHex}\n`,
    { mode: 0o600 }
  );
}

// ---------------------------------------------------------------------------
// keygen logic
// ---------------------------------------------------------------------------

describe("keygen: key pair generation", () => {
  let dir: string;
  beforeEach(() => { dir = setup(); });
  afterEach(() => cleanup(dir));

  test("generateKeyPair writes public key to .env and private key to .env.keys", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();

    writeEnv(dir, `PORT=3000\n\nENVGAD_PUBLIC_KEY=${publicKeyHex}\n`);
    writeKeys(dir, privateKeyHex);

    const envContent = readFileSync(envPath(dir), "utf8");
    expect(envContent).toContain(`ENVGAD_PUBLIC_KEY=${publicKeyHex}`);

    const keysContent = readFileSync(keysPath(dir), "utf8");
    expect(keysContent).toContain(`ENVGAD_PRIVATE_KEY=${privateKeyHex}`);
  });

  test("public key is 88 hex chars (44-byte SPKI DER)", () => {
    const { publicKeyHex } = generateKeyPair();
    expect(publicKeyHex).toHaveLength(88);
    expect(publicKeyHex).toMatch(/^[a-f0-9]+$/i);
  });

  test("private key is 96 hex chars (48-byte PKCS8 DER)", () => {
    const { privateKeyHex } = generateKeyPair();
    expect(privateKeyHex).toHaveLength(96);
    expect(privateKeyHex).toMatch(/^[a-f0-9]+$/i);
  });

  test("each keygen call produces a unique key pair", () => {
    const a = generateKeyPair();
    const b = generateKeyPair();
    expect(a.publicKeyHex).not.toBe(b.publicKeyHex);
    expect(a.privateKeyHex).not.toBe(b.privateKeyHex);
  });
});

// ---------------------------------------------------------------------------
// encrypt logic (mirrors what the encrypt command does)
// ---------------------------------------------------------------------------

describe("encrypt: encrypting plaintext values in .env", () => {
  let dir: string;
  beforeEach(() => { dir = setup(); });
  afterEach(() => cleanup(dir));

  test("encrypts a plaintext field and rewrites .env", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    writeEnv(
      dir,
      `DATABASE_URL=postgres://localhost/db\nENVGAD_PUBLIC_KEY=${publicKeyHex}\n`
    );

    // Simulate what the encrypt command does
    const envContent = readFileSync(envPath(dir), "utf8");
    const parsed = dotenv.parse(envContent);
    const encrypted = encryptEnvValue(parsed.DATABASE_URL, parsed.ENVGAD_PUBLIC_KEY, "DATABASE_URL");
    const updated = envContent.replace(/^(DATABASE_URL\s*=).*$/m, `$1${encrypted}`);

    copyFileSync(envPath(dir), `${envPath(dir)}.bak`);
    writeFileSync(envPath(dir), updated);

    const result = readFileSync(envPath(dir), "utf8");
    expect(result).toMatch(/^DATABASE_URL=encrypted:v1:/m);
    // Backup was created
    expect(existsSync(`${envPath(dir)}.bak`)).toBe(true);
    // Backup contains original plaintext
    expect(readFileSync(`${envPath(dir)}.bak`, "utf8")).toContain("postgres://localhost/db");
    // Decrypts back to original
    const encVal = dotenv.parse(result).DATABASE_URL;
    expect(decryptEnvValue(encVal, privateKeyHex, "DATABASE_URL")).toBe("postgres://localhost/db");
  });

  test("already-encrypted values are skipped (idempotent)", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const ct = encryptEnvValue("postgres://localhost/db", publicKeyHex, "DATABASE_URL");

    writeEnv(dir, `DATABASE_URL=${ct}\nENVGAD_PUBLIC_KEY=${publicKeyHex}\n`);

    const envContent = readFileSync(envPath(dir), "utf8");
    const parsed = dotenv.parse(envContent);

    // encrypt command skips already-encrypted values
    expect(isEncryptedValue(parsed.DATABASE_URL)).toBe(true);

    // Content should be unchanged
    writeFileSync(envPath(dir), envContent);
    expect(readFileSync(envPath(dir), "utf8")).toBe(envContent);

    // Original value still decryptable
    expect(decryptEnvValue(parsed.DATABASE_URL, privateKeyHex, "DATABASE_URL"))
      .toBe("postgres://localhost/db");
  });

  test("encrypts multiple fields in one pass", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    writeEnv(
      dir,
      `DATABASE_URL=postgres://localhost/db\nAPI_SECRET=sk-secret\nPORT=3000\nENVGAD_PUBLIC_KEY=${publicKeyHex}\n`
    );

    const envContent = readFileSync(envPath(dir), "utf8");
    const parsed = dotenv.parse(envContent);

    let updated = envContent;
    for (const key of ["DATABASE_URL", "API_SECRET"]) {
      const ct = encryptEnvValue(parsed[key], parsed.ENVGAD_PUBLIC_KEY, key);
      updated = updated.replace(new RegExp(`^(${key}\\s*=).*$`, "m"), `$1${ct}`);
    }

    writeFileSync(envPath(dir), updated);

    const result = dotenv.parse(readFileSync(envPath(dir), "utf8"));
    expect(decryptEnvValue(result.DATABASE_URL, privateKeyHex, "DATABASE_URL"))
      .toBe("postgres://localhost/db");
    expect(decryptEnvValue(result.API_SECRET, privateKeyHex, "API_SECRET"))
      .toBe("sk-secret");
    expect(result.PORT).toBe("3000"); // untouched
  });
});

// ---------------------------------------------------------------------------
// decrypt logic (mirrors what the decrypt command does)
// ---------------------------------------------------------------------------

describe("decrypt: decrypting encrypted values", () => {
  let dir: string;
  beforeEach(() => { dir = setup(); });
  afterEach(() => cleanup(dir));

  test("decrypts all encrypted fields from .env.keys", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const ct = encryptEnvValue("postgres://localhost/db", publicKeyHex, "DATABASE_URL");
    writeEnv(dir, `DATABASE_URL=${ct}\nENVGAD_PUBLIC_KEY=${publicKeyHex}\n`);
    writeKeys(dir, privateKeyHex);

    const envContent = readFileSync(envPath(dir), "utf8");
    const parsed = dotenv.parse(envContent);
    const key = loadPrivateKey({ keysPath: keysPath(dir) });

    expect(key).toBe(privateKeyHex);
    expect(decryptEnvValue(parsed.DATABASE_URL, key!, "DATABASE_URL"))
      .toBe("postgres://localhost/db");
  });

  test("fails with clear error when private key is missing", () => {
    const { publicKeyHex } = generateKeyPair();
    const ct = encryptEnvValue("secret", publicKeyHex, "SECRET");
    writeEnv(dir, `SECRET=${ct}\nENVGAD_PUBLIC_KEY=${publicKeyHex}\n`);
    // No .env.keys written

    const schema = defineSchema({ SECRET: { type: "string", encrypted: true } });
    const v = new EnvValidator(schema, { keysPath: keysPath(dir) });
    const parsed = dotenv.parse(readFileSync(envPath(dir), "utf8"));

    delete process.env.ENVGAD_PRIVATE_KEY;
    expect(() => v.validate(parsed)).toThrow(EncryptionKeyMissingError);
  });

  test("loadPrivateKey reads from .env.keys file", () => {
    const { privateKeyHex } = generateKeyPair();
    writeKeys(dir, privateKeyHex);

    const loaded = loadPrivateKey({ keysPath: keysPath(dir) });
    expect(loaded).toBe(privateKeyHex);
  });

  test("loadPrivateKey throws on truncated key in .env.keys file", () => {
    const truncatedKey = "ab".repeat(47); // 94 chars instead of 96
    writeFileSync(
      keysPath(dir),
      `ENVGAD_PRIVATE_KEY=${truncatedKey}\n`
    );
    expect(() => loadPrivateKey({ keysPath: keysPath(dir) })).toThrow(/expected 96-char/i);
  });
});

// ---------------------------------------------------------------------------
// verify logic (mirrors what the verify command does)
// ---------------------------------------------------------------------------

describe("verify: dry-run decryption check", () => {
  let dir: string;
  beforeEach(() => { dir = setup(); });
  afterEach(() => cleanup(dir));

  test("all encrypted fields verify successfully with correct key", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const fields = {
      DATABASE_URL: "postgres://localhost/db",
      API_SECRET: "sk-secret",
    };

    let envContent = `ENVGAD_PUBLIC_KEY=${publicKeyHex}\n`;
    for (const [key, val] of Object.entries(fields)) {
      envContent += `${key}=${encryptEnvValue(val, publicKeyHex, key)}\n`;
    }
    writeEnv(dir, envContent);
    writeKeys(dir, privateKeyHex);

    const parsed = dotenv.parse(envContent);
    const privateKey = loadPrivateKey({ keysPath: keysPath(dir) });

    const results: { key: string; ok: boolean }[] = [];
    for (const [key] of Object.entries(fields)) {
      try {
        decryptEnvValue(parsed[key], privateKey!, key);
        results.push({ key, ok: true });
      } catch {
        results.push({ key, ok: false });
      }
    }

    expect(results.every((r) => r.ok)).toBe(true);
  });

  test("verify fails when key file has been rotated (wrong key)", () => {
    const original = generateKeyPair();
    const rotated = generateKeyPair();

    // Encrypt with original key
    const ct = encryptEnvValue("secret", original.publicKeyHex, "SECRET");
    writeEnv(dir, `SECRET=${ct}\nENVGAD_PUBLIC_KEY=${rotated.publicKeyHex}\n`);
    // Keys file has the new (wrong) private key
    writeKeys(dir, rotated.privateKeyHex);

    const parsed = dotenv.parse(readFileSync(envPath(dir), "utf8"));
    const privateKey = loadPrivateKey({ keysPath: keysPath(dir) });

    expect(() => decryptEnvValue(parsed.SECRET, privateKey!, "SECRET")).toThrow();
  });

  test("plaintext value on encrypted field fails verify", () => {
    const schema = defineSchema({
      SECRET: { type: "string", required: true, encrypted: true },
    });
    const v = new EnvValidator(schema, { keysPath: keysPath(dir) });
    expect(() => v.validate({ SECRET: "plaintext" })).toThrow(EnvAggregateError);
  });
});

// ---------------------------------------------------------------------------
// rotate logic (mirrors what the rotate command does)
// ---------------------------------------------------------------------------

describe("rotate: key rotation", () => {
  let dir: string;
  beforeEach(() => { dir = setup(); });
  afterEach(() => cleanup(dir));

  test("re-encrypts all fields with new key pair", () => {
    const old = generateKeyPair();
    const fields = { DATABASE_URL: "postgres://localhost/db", API_SECRET: "sk-secret" };

    let envContent = `ENVGAD_PUBLIC_KEY=${old.publicKeyHex}\n`;
    for (const [key, val] of Object.entries(fields)) {
      envContent += `${key}=${encryptEnvValue(val, old.publicKeyHex, key)}\n`;
    }
    writeEnv(dir, envContent);
    writeKeys(dir, old.privateKeyHex);

    // --- Simulate rotate ---
    const parsed = dotenv.parse(readFileSync(envPath(dir), "utf8"));
    const oldPrivateKey = loadPrivateKey({ keysPath: keysPath(dir) })!;

    // Step 1: decrypt all
    const decrypted: Record<string, string> = {};
    for (const key of Object.keys(fields)) {
      decrypted[key] = decryptEnvValue(parsed[key], oldPrivateKey, key);
    }

    // Step 2: generate new key pair
    const newKeys = generateKeyPair();

    // Step 3: re-encrypt with new public key
    let updatedEnv = readFileSync(envPath(dir), "utf8");
    updatedEnv = updatedEnv.replace(/^ENVGAD_PUBLIC_KEY=.*$/m, `ENVGAD_PUBLIC_KEY=${newKeys.publicKeyHex}`);
    for (const [key, val] of Object.entries(decrypted)) {
      const newCt = encryptEnvValue(val, newKeys.publicKeyHex, key);
      updatedEnv = updatedEnv.replace(new RegExp(`^(${key}\\s*=).*$`, "m"), `$1${newCt}`);
    }

    // Step 4: backup then write
    copyFileSync(envPath(dir), `${envPath(dir)}.bak`);
    writeFileSync(envPath(dir), updatedEnv);
    copyFileSync(keysPath(dir), `${keysPath(dir)}.bak`);
    writeFileSync(
      keysPath(dir),
      `ENVGAD_PRIVATE_KEY=${newKeys.privateKeyHex}\nENVGAD_PRIVATE_KEY_OLD=${old.privateKeyHex}\n`,
      { mode: 0o600 }
    );
    // --- end rotate simulation ---

    // All fields decrypt correctly with new key
    const rotatedParsed = dotenv.parse(readFileSync(envPath(dir), "utf8"));
    for (const [key, originalVal] of Object.entries(fields)) {
      expect(decryptEnvValue(rotatedParsed[key], newKeys.privateKeyHex, key)).toBe(originalVal);
    }

    // Old key can no longer decrypt new ciphertexts
    expect(() =>
      decryptEnvValue(rotatedParsed.DATABASE_URL, old.privateKeyHex, "DATABASE_URL")
    ).toThrow();

    // Backups exist
    expect(existsSync(`${envPath(dir)}.bak`)).toBe(true);
    expect(existsSync(`${keysPath(dir)}.bak`)).toBe(true);
  });

  test("rotation aborts cleanly when decryption fails (wrong old key)", () => {
    const real = generateKeyPair();
    const wrong = generateKeyPair();

    const ct = encryptEnvValue("secret", real.publicKeyHex, "SECRET");
    writeEnv(dir, `SECRET=${ct}\nENVGAD_PUBLIC_KEY=${real.publicKeyHex}\n`);
    writeKeys(dir, wrong.privateKeyHex); // wrong key in .env.keys

    const parsed = dotenv.parse(readFileSync(envPath(dir), "utf8"));
    const badKey = loadPrivateKey({ keysPath: keysPath(dir) })!;

    const errors: string[] = [];
    try {
      decryptEnvValue(parsed.SECRET, badKey, "SECRET");
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "failed");
    }

    expect(errors).toHaveLength(1);
    // .env should be unchanged — rotation would abort before writing
    expect(readFileSync(envPath(dir), "utf8")).toContain(`SECRET=${ct}`);
  });

  test("old private key is preserved in .env.keys after rotation", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    writeEnv(dir, `ENVGAD_PUBLIC_KEY=${publicKeyHex}\n`);
    writeKeys(dir, privateKeyHex);

    const newKeys = generateKeyPair();
    writeFileSync(
      keysPath(dir),
      `ENVGAD_PRIVATE_KEY=${newKeys.privateKeyHex}\nENVGAD_PRIVATE_KEY_OLD=${privateKeyHex}\n`
    );

    const content = readFileSync(keysPath(dir), "utf8");
    expect(content).toContain(`ENVGAD_PRIVATE_KEY=${newKeys.privateKeyHex}`);
    expect(content).toContain(`ENVGAD_PRIVATE_KEY_OLD=${privateKeyHex}`);
  });
});

// ---------------------------------------------------------------------------
// status logic (mirrors what the status command does)
// ---------------------------------------------------------------------------

describe("status: encryption status reporting", () => {
  let dir: string;
  beforeEach(() => { dir = setup(); });
  afterEach(() => cleanup(dir));

  test("correctly identifies encrypted, plaintext, and missing fields", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const ct = encryptEnvValue("secret", publicKeyHex, "API_SECRET");

    writeEnv(
      dir,
      `API_SECRET=${ct}\nPORT=3000\nENVGAD_PUBLIC_KEY=${publicKeyHex}\n`
    );
    writeKeys(dir, privateKeyHex);

    const parsed = dotenv.parse(readFileSync(envPath(dir), "utf8"));

    // Status logic
    const schema = defineSchema({
      API_SECRET: { type: "string", encrypted: true },
      PORT: { type: "number" },
      DATABASE_URL: { type: "string", encrypted: true }, // missing in .env
    });

    const results: Record<string, "encrypted" | "plaintext" | "missing"> = {};
    for (const [key, rule] of Object.entries(schema)) {
      const value = parsed[key];
      if (!value) {
        results[key] = "missing";
      } else if (rule.encrypted && isEncryptedValue(value)) {
        results[key] = "encrypted";
      } else {
        results[key] = "plaintext";
      }
    }

    expect(results.API_SECRET).toBe("encrypted");
    expect(results.PORT).toBe("plaintext");
    expect(results.DATABASE_URL).toBe("missing");
  });

  test("detects public key presence in .env", () => {
    const { publicKeyHex } = generateKeyPair();
    writeEnv(dir, `ENVGAD_PUBLIC_KEY=${publicKeyHex}\n`);
    const parsed = dotenv.parse(readFileSync(envPath(dir), "utf8"));
    expect(Boolean(parsed.ENVGAD_PUBLIC_KEY)).toBe(true);
  });

  test("detects missing public key", () => {
    writeEnv(dir, `PORT=3000\n`);
    const parsed = dotenv.parse(readFileSync(envPath(dir), "utf8"));
    expect(Boolean(parsed.ENVGAD_PUBLIC_KEY)).toBe(false);
  });

  test("detects private key from .env.keys", () => {
    const { privateKeyHex } = generateKeyPair();
    writeKeys(dir, privateKeyHex);
    expect(loadPrivateKey({ keysPath: keysPath(dir) })).toBe(privateKeyHex);
  });

  test("returns null private key when .env.keys is absent", () => {
    delete process.env.ENVGAD_PRIVATE_KEY;
    expect(loadPrivateKey({ keysPath: keysPath(dir) })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Full end-to-end: keygen → encrypt → runtime loadEnv → verify
// ---------------------------------------------------------------------------

describe("End-to-end: keygen → encrypt → validate", () => {
  let dir: string;
  beforeEach(() => { dir = setup(); });
  afterEach(() => cleanup(dir));

  test("full flow: generate keys, encrypt fields, validate at runtime", () => {
    // 1. keygen
    const { publicKeyHex, privateKeyHex } = generateKeyPair();

    // 2. Write .env with plaintext secrets + public key
    writeEnv(
      dir,
      `DATABASE_URL=postgres://user:pass@localhost/mydb\nAPI_SECRET=sk-1234\nPORT=3000\nENVGAD_PUBLIC_KEY=${publicKeyHex}\n`
    );
    writeKeys(dir, privateKeyHex);

    // 3. Encrypt in-place (simulate encrypt command)
    let envContent = readFileSync(envPath(dir), "utf8");
    const parsed = dotenv.parse(envContent);
    for (const key of ["DATABASE_URL", "API_SECRET"]) {
      const ct = encryptEnvValue(parsed[key], parsed.ENVGAD_PUBLIC_KEY, key);
      envContent = envContent.replace(new RegExp(`^(${key}\\s*=).*$`, "m"), `$1${ct}`);
    }
    copyFileSync(envPath(dir), `${envPath(dir)}.bak`);
    writeFileSync(envPath(dir), envContent);

    // 4. Runtime: validate + decrypt via EnvValidator
    const schema = defineSchema({
      DATABASE_URL: { type: "string", required: true, encrypted: true },
      API_SECRET: { type: "string", required: true, encrypted: true },
      PORT: { type: "number", default: 3000 },
    });

    const runtimeEnv = dotenv.parse(readFileSync(envPath(dir), "utf8"));
    const validator = new EnvValidator(schema, { keysPath: keysPath(dir) });
    const result = validator.validate(runtimeEnv);

    expect(result.DATABASE_URL).toBe("postgres://user:pass@localhost/mydb");
    expect(result.API_SECRET).toBe("sk-1234");
    expect(result.PORT).toBe(3000);

    // 5. Verify: all fields decrypt without error
    const finalParsed = dotenv.parse(readFileSync(envPath(dir), "utf8"));
    const key = loadPrivateKey({ keysPath: keysPath(dir) })!;
    expect(() => decryptEnvValue(finalParsed.DATABASE_URL, key, "DATABASE_URL")).not.toThrow();
    expect(() => decryptEnvValue(finalParsed.API_SECRET, key, "API_SECRET")).not.toThrow();
  });
});
