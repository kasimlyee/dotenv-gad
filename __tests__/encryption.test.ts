import { describe, test, expect, beforeEach } from "vitest";
import { EnvValidator } from "../src/validator.js";
import { defineSchema } from "../src/schema.js";
import { EnvAggregateError, EncryptionKeyMissingError } from "../src/errors.js";
import { generateKeyPair, encryptEnvValue } from "../src/crypto.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEncryptedEnv(
  fields: Record<string, string>,
  publicKeyHex: string
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = encryptEnvValue(value, publicKeyHex, key);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Decryption during validation
// ---------------------------------------------------------------------------

describe("Validator: decryption preprocessing", () => {
  test("decrypts string field and returns plaintext", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const schema = defineSchema({
      DATABASE_URL: { type: "string", required: true, encrypted: true },
    });

    const env = makeEncryptedEnv(
      { DATABASE_URL: "postgres://localhost/db" },
      publicKeyHex
    );

    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    process.env.ENVGAD_PRIVATE_KEY = privateKeyHex;
    try {
      const result = v.validate(env);
      expect(result.DATABASE_URL).toBe("postgres://localhost/db");
    } finally {
      delete process.env.ENVGAD_PRIVATE_KEY;
    }
  });

  test("decrypted value is still type-checked (number field)", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const schema = defineSchema({
      PORT: { type: "number", required: true, encrypted: true },
    });

    const env = makeEncryptedEnv({ PORT: "5432" }, publicKeyHex);

    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    process.env.ENVGAD_PRIVATE_KEY = privateKeyHex;
    try {
      const result = v.validate(env);
      expect(result.PORT).toBe(5432);
    } finally {
      delete process.env.ENVGAD_PRIVATE_KEY;
    }
  });

  test("decrypts multiple encrypted fields in one pass", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const schema = defineSchema({
      DB_URL: { type: "string", required: true, encrypted: true },
      API_KEY: { type: "string", required: true, encrypted: true },
      PORT: { type: "number", required: true }, // not encrypted
    });

    const env = {
      ...makeEncryptedEnv(
        { DB_URL: "postgres://localhost/db", API_KEY: "sk-secret" },
        publicKeyHex
      ),
      PORT: "3000",
    };

    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    process.env.ENVGAD_PRIVATE_KEY = privateKeyHex;
    try {
      const result = v.validate(env);
      expect(result.DB_URL).toBe("postgres://localhost/db");
      expect(result.API_KEY).toBe("sk-secret");
      expect(result.PORT).toBe(3000);
    } finally {
      delete process.env.ENVGAD_PRIVATE_KEY;
    }
  });

  test("non-encrypted fields pass through normally alongside encrypted ones", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const schema = defineSchema({
      SECRET: { type: "string", encrypted: true },
      PLAIN: { type: "string" },
    });

    const env = {
      SECRET: encryptEnvValue("my-secret", publicKeyHex, "SECRET"),
      PLAIN: "hello",
    };

    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    process.env.ENVGAD_PRIVATE_KEY = privateKeyHex;
    try {
      const result = v.validate(env);
      expect(result.SECRET).toBe("my-secret");
      expect(result.PLAIN).toBe("hello");
    } finally {
      delete process.env.ENVGAD_PRIVATE_KEY;
    }
  });
});

// ---------------------------------------------------------------------------
// Missing private key
// ---------------------------------------------------------------------------

describe("Validator: missing private key", () => {
  test("throws EncryptionKeyMissingError when private key is absent", () => {
    const { publicKeyHex } = generateKeyPair();
    const schema = defineSchema({
      SECRET: { type: "string", encrypted: true },
    });
    const env = makeEncryptedEnv({ SECRET: "value" }, publicKeyHex);

    delete process.env.ENVGAD_PRIVATE_KEY;
    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    expect(() => v.validate(env)).toThrow(EncryptionKeyMissingError);
  });

  test("does NOT throw when encrypted field has no value (nothing to decrypt)", () => {
    const schema = defineSchema({
      OPTIONAL_SECRET: { type: "string", encrypted: true },
    });

    delete process.env.ENVGAD_PRIVATE_KEY;
    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    // No value in env → no decryption attempted → no key needed
    expect(() => v.validate({})).not.toThrow(EncryptionKeyMissingError);
  });
});

// ---------------------------------------------------------------------------
// Schema/value mismatch errors
// ---------------------------------------------------------------------------

describe("Validator: plaintext value on encrypted field", () => {
  test("errors when encrypted: true field has a plaintext value", () => {
    const schema = defineSchema({
      SECRET: { type: "string", required: true, encrypted: true },
    });

    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    expect(() => v.validate({ SECRET: "plaintext-value" })).toThrow(EnvAggregateError);
  });

  test("error message mentions encryption remediation", () => {
    const schema = defineSchema({
      SECRET: { type: "string", required: true, encrypted: true },
    });

    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    try {
      v.validate({ SECRET: "plaintext-value" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toMatch(/encrypt/i);
    }
  });

  test("allowPlaintext mode: warns instead of erroring, returns value", () => {
    const { publicKeyHex: _pub, privateKeyHex: _priv } = generateKeyPair();
    const schema = defineSchema({
      SECRET: { type: "string", encrypted: true },
    });

    const v = new EnvValidator(schema, {
      allowPlaintext: true,
      keysPath: ".nonexistent-xyz.keys",
    });
    // Should not throw — allowPlaintext suppresses the mismatch error
    const result = v.validate({ SECRET: "my-plaintext" });
    expect(result.SECRET).toBe("my-plaintext");
  });
});

describe("Validator: encrypted value on non-encrypted field", () => {
  test("errors when a non-encrypted field receives an encrypted:v1: value", () => {
    const { publicKeyHex } = generateKeyPair();
    const schema = defineSchema({
      API_KEY: { type: "string" }, // no encrypted: true
    });

    const env = makeEncryptedEnv({ API_KEY: "sk-secret" }, publicKeyHex);
    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });

    expect(() => v.validate(env)).toThrow(EnvAggregateError);
  });

  test("error message mentions schema declaration", () => {
    const { publicKeyHex } = generateKeyPair();
    const schema = defineSchema({
      API_KEY: { type: "string" },
    });

    const env = makeEncryptedEnv({ API_KEY: "sk-secret" }, publicKeyHex);
    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });

    try {
      v.validate(env);
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toMatch(/encrypted: true/);
    }
  });
});

// ---------------------------------------------------------------------------
// encrypted + sensitive: both flags can coexist
// ---------------------------------------------------------------------------

describe("Validator: encrypted + sensitive combination", () => {
  test("encrypted field with sensitive: true decrypts normally", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const schema = defineSchema({
      API_KEY: { type: "string", required: true, encrypted: true, sensitive: true },
    });

    const env = makeEncryptedEnv({ API_KEY: "sk-very-secret" }, publicKeyHex);
    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    process.env.ENVGAD_PRIVATE_KEY = privateKeyHex;
    try {
      const result = v.validate(env);
      expect(result.API_KEY).toBe("sk-very-secret");
    } finally {
      delete process.env.ENVGAD_PRIVATE_KEY;
    }
  });
});

// ---------------------------------------------------------------------------
// encrypted + required: missing required encrypted field
// ---------------------------------------------------------------------------

describe("Validator: encrypted + required", () => {
  test("required encrypted field missing from env throws with required error", () => {
    const schema = defineSchema({
      SECRET: { type: "string", required: true, encrypted: true },
    });

    delete process.env.ENVGAD_PRIVATE_KEY;
    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    try {
      v.validate({});
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toMatch(/required/i);
    }
  });
});

// ---------------------------------------------------------------------------
// encrypted + enum: enum check runs on decrypted value
// ---------------------------------------------------------------------------

describe("Validator: encrypted + enum", () => {
  test("decrypted value that matches enum passes", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const schema = defineSchema({
      NODE_ENV: {
        type: "string",
        enum: ["development", "production", "test"],
        encrypted: true,
      },
    });

    const env = makeEncryptedEnv({ NODE_ENV: "production" }, publicKeyHex);
    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    process.env.ENVGAD_PRIVATE_KEY = privateKeyHex;
    try {
      const result = v.validate(env);
      expect(result.NODE_ENV).toBe("production");
    } finally {
      delete process.env.ENVGAD_PRIVATE_KEY;
    }
  });

  test("decrypted value not in enum throws EnvAggregateError", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const schema = defineSchema({
      NODE_ENV: {
        type: "string",
        enum: ["development", "production", "test"],
        encrypted: true,
      },
    });

    const env = makeEncryptedEnv({ NODE_ENV: "staging" }, publicKeyHex);
    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    process.env.ENVGAD_PRIVATE_KEY = privateKeyHex;
    try {
      expect(() => v.validate(env)).toThrow(EnvAggregateError);
    } finally {
      delete process.env.ENVGAD_PRIVATE_KEY;
    }
  });
});

// ---------------------------------------------------------------------------
// encrypted + boolean: type coercion runs on decrypted value
// ---------------------------------------------------------------------------

describe("Validator: encrypted + boolean", () => {
  test("decrypted 'true' string coerces to boolean true", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const schema = defineSchema({
      FEATURE_FLAG: { type: "boolean", encrypted: true },
    });

    const env = makeEncryptedEnv({ FEATURE_FLAG: "true" }, publicKeyHex);
    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    process.env.ENVGAD_PRIVATE_KEY = privateKeyHex;
    try {
      const result = v.validate(env);
      expect(result.FEATURE_FLAG).toBe(true);
    } finally {
      delete process.env.ENVGAD_PRIVATE_KEY;
    }
  });

  test("decrypted 'false' string coerces to boolean false", () => {
    const { publicKeyHex, privateKeyHex } = generateKeyPair();
    const schema = defineSchema({
      FEATURE_FLAG: { type: "boolean", encrypted: true },
    });

    const env = makeEncryptedEnv({ FEATURE_FLAG: "false" }, publicKeyHex);
    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    process.env.ENVGAD_PRIVATE_KEY = privateKeyHex;
    try {
      const result = v.validate(env);
      expect(result.FEATURE_FLAG).toBe(false);
    } finally {
      delete process.env.ENVGAD_PRIVATE_KEY;
    }
  });
});

// ---------------------------------------------------------------------------
// encrypted + default: default is used when field is absent, no key needed
// ---------------------------------------------------------------------------

describe("Validator: encrypted + default", () => {
  test("absent encrypted field with a default returns the default without needing a key", () => {
    const schema = defineSchema({
      OPTIONAL_SECRET: { type: "string", encrypted: true, default: "fallback" },
    });

    delete process.env.ENVGAD_PRIVATE_KEY;
    const v = new EnvValidator(schema, { keysPath: ".nonexistent-xyz.keys" });
    const result = v.validate({});
    expect(result.OPTIONAL_SECRET).toBe("fallback");
  });
});
