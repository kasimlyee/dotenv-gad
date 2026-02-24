import { SchemaDefinition, SchemaRule } from "./schema.js";
import { EnvAggregateError, EncryptionKeyMissingError } from "./errors.js";
import { decryptEnvValue, isEncryptedValue, loadPrivateKey } from "./crypto.js";

export class EnvValidator {
  private errors: {
    key: string;
    message: string;
    value?: any;
    rule?: SchemaRule;
  }[] = [];

  /**
   * Constructs a new EnvValidator instance.
   * @param {SchemaDefinition} schema The schema definition for the environment variables.
   * @param {Object} [options] Optional options for the validation process.
   * @param {boolean} [options.strict] When true, environment variables not present in the schema will be rejected.
   * @param {boolean} [options.allowPlaintext] When true, fields with `encrypted: true` that have plaintext values emit a warning instead of an error. Useful for gradual migration.
   * @param {string} [options.keysPath] Path to the `.env.keys` file (default: `.env.keys`).
   */
  constructor(
    private schema: SchemaDefinition,
    private options?: {
      strict?: boolean;
      includeRaw?: boolean;
      includeSensitive?: boolean;
      allowPlaintext?: boolean;
      keysPath?: string;
    }
  ) {}

  validate(env: Record<string, string | undefined>) {
    this.errors = [];

    // Step 1: Decrypt encrypted fields and check for schema/value mismatches.
    const { processedEnv, skipKeys } = this.preprocessEncryption(env);

    const result: Record<string, any> = {};

    // Build grouping map for object types that support envPrefix.
    // We'll collect all prefixes first and then make a single pass over env keys
    // to assemble grouped objects for each schema key.
    const groupedEnv: Record<string, Record<string, any>> = {};
    const prefixes: { key: string; prefix: string }[] = [];
    for (const [k, r] of Object.entries(this.schema)) {
      const eff = this.getEffectiveRule(k, r);
      if (eff.type === "object" && eff.properties) {
        const prefix = eff.envPrefix ?? `${k}_`;
        prefixes.push({ key: k, prefix });
        groupedEnv[k] = {};
      }
    }

    const envKeys = Object.keys(processedEnv);
    for (let i = 0; i < envKeys.length; i++) {
      const eKey = envKeys[i];
      for (let j = 0; j < prefixes.length; j++) {
        const { key, prefix } = prefixes[j];
        if (eKey.startsWith(prefix)) {
          const subKey = eKey.slice(prefix.length);
          groupedEnv[key][subKey] = processedEnv[eKey];
        }
      }
    }

    // Micro-optimization: avoid creating intermediate arrays from Object.entries
    const schemaKeys = Object.keys(this.schema);
    for (let i = 0; i < schemaKeys.length; i++) {
      const key = schemaKeys[i];
      const rule = this.schema[key];

      // Skip keys that already have a preprocessing error (encryption mismatch, decryption failure, etc.)
      if (skipKeys.has(key)) continue;

      try {
        // If we have grouped values for this key use them (preferred over JSON string)
        const valToValidate = groupedEnv[key] && Object.keys(groupedEnv[key]).length > 0
          ? groupedEnv[key]
          : processedEnv[key];

        // If both grouped and a top-level JSON value exist, prefer grouped and warn
        if (groupedEnv[key] && Object.keys(groupedEnv[key]).length > 0 && processedEnv[key] !== undefined) {
          console.warn(`Both prefixed variables and top-level ${key} exist; prefixed vars are used`);
        }

        // If strict mode is enabled, and this key has grouped env vars, ensure there are no unexpected subkeys
        if (this.options?.strict && groupedEnv[key] && Object.keys(groupedEnv[key]).length > 0) {
          const propNames = rule.properties ? Object.keys(rule.properties) : [];
          const extras = Object.keys(groupedEnv[key]).filter((s) => !propNames.includes(s));
          if (extras.length > 0) {
            this.errors.push({
              key,
              message: `Unexpected grouped environment variables: ${extras.join(", ")}`,
              value: Object.keys(groupedEnv[key]),
              rule,
            });
            continue;
          }
        }

        result[key] = this.validateKey(key, rule, valToValidate);
      } catch (error) {
        if (error instanceof Error) {
          // Decide what to include in the error report depending on options:
          // - default: redact sensitive values and shorten long strings
          // - includeRaw: include raw values for non-sensitive fields
          // - includeSensitive: when used with includeRaw, include raw sensitive values too (use with caution)
          let displayedValue: any;
          if (processedEnv[key] === undefined) {
            displayedValue = undefined;
          } else if (this.options?.includeRaw) {
            if (rule.sensitive && !this.options?.includeSensitive) {
              displayedValue = "****";
            } else {
              displayedValue = processedEnv[key];
            }
          } else {
            displayedValue = this.redactValue(processedEnv[key], rule.sensitive);
          }

          this.errors.push({
            key,
            message: error.message,
            value: displayedValue,
            rule,
          });
        }
      }
    }

    if (this.options?.strict) {
      const prefixedKeys = new Set<string>();
      for (const p of prefixes) {
        for (const eKey of envKeys) {
          if (eKey.startsWith(p.prefix)) prefixedKeys.add(eKey);
        }
      }

      for (const k of envKeys) {
        if (!(k in this.schema) && !prefixedKeys.has(k)) {
          this.errors.push({
            key: k,
            message: `Unexpected environment variable`,
          });
        }
      }
    }

    if (this.errors.length > 0) {
      const keys = this.errors.map((e) => e.key).join(", ");
      throw new EnvAggregateError(
        this.errors,
        `Environment validation failed: ${keys}`
      );
    }

    return result;
  }

  // Redact or trim sensitive values for error reporting
  private redactValue(value: any, sensitive?: boolean) {
    if (value === undefined) return undefined;
    if (sensitive) return "****";
    if (typeof value !== "string") return value;
    if (value.length > 64) {
      return `${value.slice(0, 4)}...${value.slice(-4)}`;
    }
    return value;
  }

  // Try to quickly determine if a string *might* be JSON before parsing to avoid
  // costly exceptions in the hot path for clearly non-JSON values.
  private tryParseJSON(value: any) {
    if (typeof value !== "string") return { ok: false } as const;
    const s = value.trim();
    if (!s) return { ok: false } as const;
    const c = s[0];
    if (c !== "{" && c !== "[" && c !== '"' && c !== "t" && c !== "f" && c !== "n" && (c < "0" || c > "9") && c !== "-") {
      return { ok: false } as const;
    }
    try {
      return { ok: true as const, value: JSON.parse(s) };
    } catch {
      return { ok: false } as const;
    }
  }

  private validateKey(key: string, rule: SchemaRule, value: any) {
    const effectiveRule = this.getEffectiveRule(key, rule);
    if (value === undefined || value === "") {
      if (effectiveRule.required)
        throw new Error(`Missing required environment variable`);
      return effectiveRule.default;
    }

    if (effectiveRule.transform) {
      value = effectiveRule.transform(value);
    }

    switch (effectiveRule.type) {
      case "string":
        value = String(value).trim();
        if (effectiveRule.minLength !== undefined && value.length < effectiveRule.minLength) {
          throw new Error(
            `Environment variable ${key} must be at least ${effectiveRule.minLength} characters`
          );
        }
        if (effectiveRule.maxLength !== undefined && value.length > effectiveRule.maxLength) {
          throw new Error(
            `Environment variable ${key} must be at most ${effectiveRule.maxLength} characters`
          );
        }
        break;

      case "number":
        value = Number(value);
        if (isNaN(value)) {
          throw new Error(`Environment variable ${key} must be a number`);
        }
        if (effectiveRule.min !== undefined && value < effectiveRule.min) {
          throw new Error(
            `Environment variable ${key} must be at least ${effectiveRule.min}`
          );
        }
        if (effectiveRule.max !== undefined && value > effectiveRule.max) {
          throw new Error(
            `Environment variable ${key} must be at most ${effectiveRule.max}`
          );
        }
        break;

      case "boolean":
        if (typeof value === "string") {
          value = value.toLowerCase();

          if (value === "true") {
            value = true;
          } else if (value === "false") {
            value = false;
          }
        }

        if (typeof value !== "boolean") {
          throw new Error(
            `Environment variable ${key} must be a boolean (true/false)`
          );
        }
        value = Boolean(value);
        break;

      case "date":
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(`Environment variable ${key} must be a valid date`);
        }
        value = date;
        break;

      case "url":
        try {
          new URL(String(value));
        } catch {
          throw new Error("Must be a valid URL");
        }
        break;

      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          throw new Error("Must be a valid email");
        }
        break;

      case "ip":
        if (!/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(String(value))) {
           throw new Error("Must be a valid IP address");
        }
        break;
      case "port":
        const port = Number(value);
        if (isNaN(port) || !Number.isInteger(port)) throw new Error("Must be an integer");
        if (port < 1 || port > 65535) {
          throw new Error("Must be between 1 and 65535");
        }
        value = port;
        break;

      case "json":
        // fast-path non-json strings
        const maybeJson = this.tryParseJSON(value);
        if (!maybeJson.ok) {
          throw new Error("Must be valid JSON");
        }
        value = maybeJson.value;
        break;

      case "array":
        if (!Array.isArray(value)) {
          const parsed = this.tryParseJSON(value);
          if (!parsed.ok || !Array.isArray(parsed.value)) {
            throw new Error("Must be a valid array or JSON array string");
          }
          value = parsed.value;
        }

        if (effectiveRule.items) {
          value = value.map((item: any, i: any) => {
            try {
              return this.validateKey(
                `${key}[${i}]`,
                effectiveRule.items!,
                item
              );
            } catch (error: any) {
              throw new Error(`Array item '${i}':${error.message}`);
            }
          });
        }
        break;

      case "object":
        if (typeof value === "string") {
          const parsed = this.tryParseJSON(value);
          if (!parsed.ok || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
            throw new Error("Must be a valid object or JSON string");
          }
          value = parsed.value;
        }

        if (effectiveRule.properties) {
          const obj: Record<string, any> = {};
          for (const prop in effectiveRule.properties) {
            if (!Object.prototype.hasOwnProperty.call(effectiveRule.properties, prop)) continue;
            const propRule = effectiveRule.properties[prop];
            try {
              obj[prop] = this.validateKey(
                `${key}.${prop}`,
                propRule,
                value[prop]
              );
            } catch (error: any) {
              throw new Error(`Property '${prop}':${error.message}`);
            }
          }
          value = obj;
        }
        break;
    }

    if (effectiveRule.enum && !effectiveRule.enum.includes(value)) {
      throw new Error(
        `Environment variable ${key} must be one of ${effectiveRule.enum.join(
          ", "
        )}`
      );
    }

    if (effectiveRule.regex && !effectiveRule.regex.test(String(value))) {
      throw new Error(
        effectiveRule.regexError ||
          `Environment variable ${key} must match ${effectiveRule.regex}`
      );
    }

    if (effectiveRule.validate && !effectiveRule.validate(value)) {
      throw new Error(effectiveRule.error || "Custom validation failed");
    }

    return value;
  }

  private getEffectiveRule(key: string, rule: SchemaRule) {
    const envName = process.env.NODE_ENV || "development";
    const envRule = rule.env?.[envName] || {};
    return { ...rule, ...envRule };
  }

  /**
   * Preprocessing step that runs before normal validation.
   *
   * - Decrypts values for fields with `encrypted: true`.
   * - Adds errors for plaintext values on `encrypted: true` fields (unless `allowPlaintext` is set).
   * - Adds errors for encrypted-format values on fields that don't declare `encrypted: true`.
   * - Throws `EncryptionKeyMissingError` early if decryption is needed but no private key is available.
   *
   * Returns a shallow copy of `env` with encrypted values replaced by their plaintexts,
   * plus a `skipKeys` set for keys that already have a preprocessing error and must be
   * skipped in the main validation loop to avoid duplicate error entries.
   */
  private preprocessEncryption(env: Record<string, string | undefined>): {
    processedEnv: Record<string, string | undefined>;
    skipKeys: Set<string>;
  } {
    const processedEnv: Record<string, string | undefined> = { ...env };
    const skipKeys = new Set<string>();

    const encryptedSchemaKeys = Object.keys(this.schema).filter(
      (k) => this.schema[k].encrypted
    );

    if (encryptedSchemaKeys.length > 0) {
      // Only load the private key when at least one value is already encrypted
      const needsDecryption = encryptedSchemaKeys.some(
        (k) => processedEnv[k] != null && processedEnv[k] !== "" && isEncryptedValue(processedEnv[k]!)
      );

      let privateKeyHex: string | null = null;
      if (needsDecryption) {
        privateKeyHex = loadPrivateKey({ keysPath: this.options?.keysPath });
        if (!privateKeyHex) {
          throw new EncryptionKeyMissingError("decryption");
        }
      }

      for (const key of encryptedSchemaKeys) {
        const value = processedEnv[key];
        if (value == null || value === "") continue; // handled by required check in main loop

        if (isEncryptedValue(value)) {
          try {
            processedEnv[key] = decryptEnvValue(value, privateKeyHex!, key);
          } catch (err) {
            this.errors.push({
              key,
              message: err instanceof Error ? err.message : "Decryption failed",
              rule: this.schema[key],
            });
            skipKeys.add(key);
          }
        } else {
          // Plaintext value for a field that should be encrypted
          if (this.options?.allowPlaintext) {
            console.warn(
              `[dotenv-gad] "${key}" has a plaintext value but schema declares encrypted: true. ` +
                "Run: npx dotenv-gad encrypt"
            );
          } else {
            this.errors.push({
              key,
              message:
                'Must be encrypted. Run: npx dotenv-gad encrypt',
              rule: this.schema[key],
            });
            skipKeys.add(key);
          }
        }
      }
    }

    // Flag any env value that looks encrypted but the schema doesn't declare encrypted: true
    for (const [eKey, value] of Object.entries(processedEnv)) {
      if (skipKeys.has(eKey)) continue;
      if (value && isEncryptedValue(value) && !this.schema[eKey]?.encrypted) {
        this.errors.push({
          key: eKey,
          message: "Encrypted value found but schema does not declare encrypted: true",
        });
        skipKeys.add(eKey);
      }
    }

    return { processedEnv, skipKeys };
  }
}
