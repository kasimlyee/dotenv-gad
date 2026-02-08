import { EnvValidator } from "./validator.js";
import { defineSchema, SchemaDefinition, SchemaRule } from "./schema.js";
import { AggregateError, EnvValidationError } from "./errors.js";
import { loadEnv, createEnvProxy } from "./utils.js";
import { composeSchema } from "./compose.js";
import {loadSchema} from "./cli/commands/utils.js";
import { applyFix } from "./cli/commands/utils.js";
import { ExtractEnv, InferEnv } from "./types.js";
import dotenv from "dotenv";

export {
  defineSchema,
  AggregateError,
  EnvValidationError,
  EnvValidator,
  loadEnv,
  createEnvProxy,
  composeSchema,
  loadSchema,
  applyFix,
};
export type { SchemaDefinition, SchemaRule, ExtractEnv, InferEnv };

export function validateEnv(
  schema: SchemaDefinition,
  options?: { strict?: boolean; path?: string }
) {
  const env = dotenv.config({debug: false, path: options?.path}).parsed || {};
  const validator = new EnvValidator(schema, options);
  return validator.validate(env);
}
