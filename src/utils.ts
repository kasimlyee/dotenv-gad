import { SchemaDefinition } from "./schema.js";
import { parse as parseEnv } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { EnvValidator } from "./validator.js";
import type { InferEnv } from "./types.js";

/**
 * Silently reads and parses a .env file without injecting into process.env.
 * Returns an empty object when the file does not exist (e.g. Vercel, Railway,
 * Docker — where env vars are already present in process.env).
 */
export function readEnvFile(path?: string): Record<string, string> {
  const filePath = path ?? ".env";
  if (!existsSync(filePath)) return {};
  try {
    return parseEnv(readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}


/**
 * Loads environment variables from a `.env` file (if present) and validates them
 * against the provided schema.
 *
 * @param schema The schema definition for the environment variables.
 * @param options Optional options for the validation process.
 * @param options.strict When true, environment variables not present in the schema will be rejected.
 * @param options.includeRaw When true, include raw values in error reports (non-sensitive by default).
 * @param options.includeSensitive When true, include values marked sensitive in error reports (use only for local debugging).
 * @param options.path Path to the `.env` file (defaults to `.env` in cwd).
 * @param options.allowPlaintext When true, fields with `encrypted: true` that have plaintext values emit a warning instead of an error.
 * @param options.keysPath Path to the `.env.keys` file containing ENVGAD_PRIVATE_KEY (default: `.env.keys`).
 * @returns The validated environment variables, typed according to the schema.
 */
export function loadEnv<S extends SchemaDefinition>(
  schema: S,
  options?: {
    strict?: boolean;
    includeRaw?: boolean;
    includeSensitive?: boolean;
    path?: string;
    allowPlaintext?: boolean;
  }
): InferEnv<S> {
  const fileEnv = readEnvFile(options?.path);
  const env = { ...process.env, ...fileEnv };

  const validator = new EnvValidator(schema, options);
  return validator.validate(env) as InferEnv<S>;
}

/**
 * Create a proxy around the validated environment variables. The proxy will
 * throw an error if you try to access a variable that is not validated.
 *
 * @param validatedEnv The validated environment variables.
 *
 * @returns A proxy object that throws an error if you access an
 * unvalidated variable.
 */
export function createEnvProxy<T extends Record<string, any>>(
  validatedEnv: T
): T {
  return new Proxy(validatedEnv, {
    get(target, prop) {
      if (typeof prop === "string" && !(prop in target)) {
        throw new Error(
          `Environment variable ${prop} is not validated`
        );
      }
      return target[prop as keyof T];
    },
  });
}
