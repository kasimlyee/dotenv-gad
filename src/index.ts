import { EnvValidator } from "./validator.js";
import { defineSchema, SchemaDefinition, SchemaRule } from "./schema.js";
import { AggregateError } from "./errors.js";
import { loadEnv, createEnvProxy } from "./utils.js";
import dotenv from "dotenv";

export { defineSchema, AggregateError, EnvValidator, loadEnv, createEnvProxy };
export type { SchemaDefinition, SchemaRule };

export function validateEnv(
  schema: SchemaDefinition,
  options?: { strict?: boolean }
) {
  const env = dotenv.config().parsed || {};
  const validator = new EnvValidator(schema, options);
  return validator.validate(env);
}
