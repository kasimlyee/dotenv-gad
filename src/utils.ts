import { SchemaDefinition } from "./schema.js";
import dotenv from "dotenv";
import { EnvValidator } from "./validator.js";

/**
 * Load the environment variables from a .env file, validate them against the schema
 * and return an object with the validated values.
 *
 * @param schema The schema definition for the environment variables.
 * @param options Options for the validation process.
 *
 * @returns A validated object with the environment variables.
 */
export function loadEnv(
  schema: SchemaDefinition,
  options?: { strict?: boolean }
) {
  const env = dotenv.config().parsed || {};
  const validator = new EnvValidator(schema, options);
  return validator.validate(env);
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
      const value = target[prop as keyof T];
      if (value === undefined) {
        throw new Error(
          `Environment variable ${String(prop)} is not validated`
        );
      }
      return value;
    },
  });
}
