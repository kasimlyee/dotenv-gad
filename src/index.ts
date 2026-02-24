import { EnvValidator } from "./validator.js";
import { defineSchema, SchemaDefinition, SchemaRule } from "./schema.js";
import {
  EnvAggregateError,
  AggregateError,
  EnvValidationError,
  EncryptionKeyMissingError,
  DecryptionFailedError,
  EncryptedFieldMismatchError,
} from "./errors.js";
import { loadEnv, createEnvProxy } from "./utils.js";
import { composeSchema } from "./compose.js";
import { ExtractEnv, InferEnv } from "./types.js";
import {
  generateKeyPair,
  encryptEnvValue,
  decryptEnvValue,
  isEncryptedValue,
  loadPrivateKey,
} from "./crypto.js";
import type { KeyPair } from "./crypto.js";
import dotenv from "dotenv";

export {
  defineSchema,
  EnvAggregateError,
  /** @deprecated Use `EnvAggregateError` instead. */
  AggregateError,
  EnvValidationError,
  EncryptionKeyMissingError,
  DecryptionFailedError,
  EncryptedFieldMismatchError,
  EnvValidator,
  loadEnv,
  createEnvProxy,
  composeSchema,
  generateKeyPair,
  encryptEnvValue,
  decryptEnvValue,
  isEncryptedValue,
  loadPrivateKey,
};
export type { SchemaDefinition, SchemaRule, ExtractEnv, InferEnv, KeyPair };

export function validateEnv(
  schema: SchemaDefinition,
  options?: {
    strict?: boolean;
    path?: string;
    allowPlaintext?: boolean;
    keysPath?: string;
  }
) {
  const fileEnv = dotenv.config({ debug: false, path: options?.path }).parsed || {};
  const env = { ...process.env, ...fileEnv };
  const validator = new EnvValidator(schema, options);
  return validator.validate(env);
}
