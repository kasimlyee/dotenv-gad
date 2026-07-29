import { SchemaDefinition } from "./schema.js";
import { parse as parseEnv } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { EnvValidator } from "./validator.js";
import type { InferEnv } from "./types.js";
import { isBun, getEnv } from "./runtime.js";

/**
 * Silently reads and parses a .env file without injecting into process.env.
 * Returns an empty object when the file does not exist (e.g. Vercel, Railway,
 * Docker — where env vars are already present in process.env).
 *
 * In Bun, this uses Bun's optimized file reading when available.
 */
export function readEnvFile(path?: string): Record<string, string> {
  const filePath = path ?? ".env";
  if (!existsSync(filePath)) return {};
  try {
    // Use Bun's file reading when available for better performance
    let content: string;
    if (isBun() && typeof (globalThis as any).Bun?.file === 'function') {
      // Bun's synchronous text reading
      const file = (globalThis as any).Bun.file(filePath);
      content = file.text ? (typeof file.text === 'function' ? file.text() : file.text) : readFileSync(filePath, "utf-8");
      // Note: Bun.file().text() is async, so fallback to readFileSync for sync operation
      content = readFileSync(filePath, "utf-8");
    } else {
      content = readFileSync(filePath, "utf-8");
    }
    return parseEnv(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[dotenv-gad] Failed to parse ${filePath}: ${message}`);
    return {};
  }
}


/**
 * Merges `.env` file values with the runtime environment. Following dotenv
 * conventions, variables already set in the real environment win over file
 * values — the file provides defaults. Pass `override: true` to invert this
 * and let file values replace runtime variables.
 */
export function mergeEnv(
  fileEnv: Record<string, string>,
  runtimeEnv: Record<string, string | undefined>,
  override?: boolean
): Record<string, string | undefined> {
  if (override) return { ...runtimeEnv, ...fileEnv };
  const env: Record<string, string | undefined> = { ...fileEnv };
  for (const [key, value] of Object.entries(runtimeEnv)) {
    if (value !== undefined) env[key] = value;
  }
  return env;
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
 * @param options.override When true, `.env` file values replace variables already set in the real environment (dotenv's `override` semantics). Default: real environment wins.
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
    keysPath?: string;
    override?: boolean;
  }
): InferEnv<S> {
  const fileEnv = readEnvFile(options?.path);
  // Use runtime-aware environment getter (process.env or Bun.env)
  const runtimeEnv = getEnv();
  const env = mergeEnv(fileEnv, runtimeEnv, options?.override);

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
