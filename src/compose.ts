import { SchemaDefinition } from "./schema.js";

/**
 * Compose multiple schema definitions into a single one.
 *
 * @example
 * const dbSchema = {
 *   DB_HOST: { type: "string" },
 *   DB_USER: { type: "string" },
 *   DB_PASSWORD: { type: "string", sensitive: true },
 * };
 *
 * const appSchema = {
 *   APP_NAME: { type: "string" },
 *   APP_PORT: { type: "number" },
 * };
 *
 * const fullSchema = composeSchema(dbSchema, appSchema);
 *
 * @param {...SchemaDefinition[]} schemas - schema definitions to compose
 * @returns {SchemaDefinition} - a single schema definition with all the properties
 */
export function composeSchema(
  ...schemas: SchemaDefinition[]
): SchemaDefinition {
  const result: SchemaDefinition = Object.create(null);
  for (const schema of schemas) {
    for (const key of Object.keys(schema)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      result[key] = schema[key];
    }
  }
  return result;
}
