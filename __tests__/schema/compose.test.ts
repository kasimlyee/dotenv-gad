import { defineSchema, composeSchema } from "../../src";

test("merges schemas correctly", () => {
  const schemaA = defineSchema({
    DB_URL: { type: "string" },
  });
  const schemaB = defineSchema({
    PORT: { type: "number" },
  });
  const mergedSchema = composeSchema(schemaA, schemaB);
  expect(mergedSchema).toHaveProperty("DB_URL");
  expect(mergedSchema).toHaveProperty("PORT");
});
