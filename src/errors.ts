import { SchemaRule } from "./schema.js";

const kValidationError = Symbol.for("dotenv-gad.EnvValidationError");
const kAggregateError  = Symbol.for("dotenv-gad.EnvAggregateError");

export class EnvValidationError extends Error {
  constructor(
    public key: string,
    public message: string,
    public receiveValue?: unknown
  ) {
    super(message);
    this.name = "EnvValidationError";
    Object.defineProperty(this, kValidationError, { value: true, enumerable: false });
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      typeof instance === "object" &&
      instance !== null &&
      Object.prototype.hasOwnProperty.call(instance, kValidationError)
    );
  }
}


Object.defineProperty(EnvValidationError, "name", {
  value: "EnvValidationError",
  configurable: true,
  writable: false,
});

type ErrorItem = {
  key: string;
  message: string;
  value?: any;
  rule?: SchemaRule;
};

// WeakMap will store the full errors array completely off the instance, 
// so Node.js inspect never sees it — no schema internals in logs.
const errorsMap = new WeakMap<EnvAggregateError, ErrorItem[]>();

export class EnvAggregateError extends Error {
  get errors(): ErrorItem[] {
    return errorsMap.get(this)!;
  }

  constructor(errors: ErrorItem[], message: string) {
    const summary = errors
      .map((e) => {
        let line = `\n  - ${e.key}: ${e.message}`;
        if (e.value !== undefined) line += ` (received: ${JSON.stringify(e.value)})`;
        if (e.rule?.docs) line += `\n    hint: ${e.rule.docs}`;
        return line;
      })
      .join("");

    super(message + summary);
    this.name = "EnvAggregateError";

    // Store full errors (including rule) off-instance, invisible to Node.js
    // inspect but fully accessible via the .errors getter in catch blocks.
    errorsMap.set(this, errors);

    Object.defineProperty(this, kAggregateError, { value: true, enumerable: false });
    Object.setPrototypeOf(this, EnvAggregateError.prototype);
  }

 
  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      typeof instance === "object" &&
      instance !== null &&
      Object.prototype.hasOwnProperty.call(instance, kAggregateError)
    );
  }

  toString() {
    const errorList = this.errors
      .map((e) => {
        let msg = `  - ${e.key}: ${e.message}`;
        if (e.value !== undefined)
          msg += ` (received: ${JSON.stringify(e.value)})`;
        if (e.rule?.docs) msg += `\n    ${e.rule.docs}`;
        return msg;
      })
      .join("\n");
    return `${this.name}: ${this.message}\n${errorList}`;
  }
}


Object.defineProperty(EnvAggregateError, "name", {
  value: "EnvAggregateError",
  configurable: true,
  writable: false,
});

/** @deprecated Use `EnvAggregateError` instead — avoids shadowing the built-in `AggregateError`. */
export const AggregateError = EnvAggregateError;

/**
 * Thrown when a required encryption or decryption key is not available.
 * For encryption: ENVGAD_PUBLIC_KEY missing from .env.
 * For decryption: ENVGAD_PRIVATE_KEY missing from .env.keys and environment.
 */
export class EncryptionKeyMissingError extends Error {
  constructor(context: "encryption" | "decryption") {
    const message =
      context === "encryption"
        ? "Public key not found. Run: npx dotenv-gad keygen"
        : "Private key not found. Obtain .env.keys from your team or set ENVGAD_PRIVATE_KEY env var. " +
          "Run: npx dotenv-gad keygen to generate new keys.";
    super(message);
    this.name = "EncryptionKeyMissingError";
    Object.setPrototypeOf(this, EncryptionKeyMissingError.prototype);
  }
}

/**
 * Thrown when ChaCha20-Poly1305 authenticated decryption fails.
 * Common causes: wrong private key, corrupted ciphertext, or AAD mismatch
 * (ciphertext copied from a different variable).
 */
export class DecryptionFailedError extends Error {
  constructor(varName: string) {
    super(
      `Decryption failed for "${varName}". Possible causes:\n` +
        "  - Wrong private key\n" +
        "  - Corrupted ciphertext\n" +
        "  - Ciphertext moved from a different variable (AAD mismatch)"
    );
    this.name = "DecryptionFailedError";
    Object.setPrototypeOf(this, DecryptionFailedError.prototype);
  }
}

/**
 * Thrown when an encrypted/plaintext value is found but the schema says otherwise.
 * When `shouldBeEncrypted = true`: schema has `encrypted: true` but value is plaintext.
 * When `shouldBeEncrypted = false`: value starts with `encrypted:v1:` but schema lacks `encrypted: true`.
 */
export class EncryptedFieldMismatchError extends Error {
  constructor(varName: string, shouldBeEncrypted: boolean) {
    const message = shouldBeEncrypted
      ? `"${varName}" must be encrypted but received a plaintext value. ` +
        "Run: npx dotenv-gad encrypt"
      : `"${varName}" has an encrypted value but schema does not declare encrypted: true`;
    super(message);
    this.name = "EncryptedFieldMismatchError";
    Object.setPrototypeOf(this, EncryptedFieldMismatchError.prototype);
  }
}
