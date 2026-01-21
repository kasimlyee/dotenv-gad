import { EnvValidator } from "./validator";
import { defineSchema, SchemaDefinition, SchemaRule } from "./schema";
import { AggregateError, EnvValidationError } from "./errors";
import { loadEnv, createEnvProxy } from "./utils";
import { composeSchema } from "./compose";
import loadSchema from "./cli/commands/types";
import { applyFix } from "./cli/commands/utils";
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
