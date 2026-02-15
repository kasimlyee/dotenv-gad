import { EnvValidator } from "./validator.js";
import { defineSchema, SchemaDefinition, SchemaRule } from "./schema.js";
import { EnvAggregateError, AggregateError, EnvValidationError } from "./errors.js";
import { loadEnv, createEnvProxy } from "./utils.js";
import { composeSchema } from "./compose.js";
import { ExtractEnv, InferEnv } from "./types.js";
import dotenv from "dotenv";

export {
  defineSchema,
  EnvAggregateError,
  /** @deprecated Use `EnvAggregateError` instead. */
  AggregateError,
  EnvValidationError,
  EnvValidator,
  loadEnv,
  createEnvProxy,
  composeSchema,
};
export type { SchemaDefinition, SchemaRule, ExtractEnv, InferEnv };

export function validateEnv(
  schema: SchemaDefinition,
  options?: { strict?: boolean; path?: string }
) {
  const fileEnv = dotenv.config({ debug: false, path: options?.path }).parsed || {};
  const env = { ...process.env, ...fileEnv };
  const validator = new EnvValidator(schema, options);
  return validator.validate(env);
}
