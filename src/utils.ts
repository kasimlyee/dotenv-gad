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
 * Loads environment variables from .env file and validates them against
 * the given schema.
 *
 * @template S The type of the schema definition.
 * @param {S} schema The schema definition for the environment variables.
 * @param {Object} [options] Optional options for the validation process.
 * @param {boolean} [options.strict] When true, fail on environment variables not present in the schema.
 * @param {boolean} [options.includeRaw] Include raw values in error reports (non-sensitive by default).
 * @param {boolean} [options.includeSensitive] When used with `includeRaw`, will reveal values marked sensitive (use only for local debugging).
 * @param {string} [options.path] Path to the .env file to load (defaults to `.env` in cwd).
 * @returns {InferEnv<S>} The validated environment variables.
 */
export function loadEnv<S extends SchemaDefinition>(
  schema: S,
  options?: { strict?: boolean; includeRaw?: boolean; includeSensitive?: boolean; path?: string }
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
