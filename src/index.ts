import { EnvValidator } from "./validator.js";
import { defineSchema, SchemaDefinition, SchemaRule } from "./schema.js";
import { AggregateError, EnvValidationError } from "./errors.js";
import { loadEnv, createEnvProxy } from "./utils.js";
import { composeSchema } from "./compose.js";
import loadSchema from "./cli/commands/types.js";
import { applyFix } from "./cli/commands/utils.js";
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
export type { SchemaDefinition, SchemaRule };

export function validateEnv(
  schema: SchemaDefinition,
  options?: { strict?: boolean }
) {
  const env = dotenv.config().parsed || {};
  const validator = new EnvValidator(schema, options);
  return validator.validate(env);
}
