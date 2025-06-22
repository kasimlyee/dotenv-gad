import { defineSchema, validateEnv } from "../src";

describe("Edge Cases", () => {
  test("handles empty strings differently from undefined", () => {
    const schema = defineSchema({
      EMPTY_STRING: {
        type: "string",
        default: "default",
      },
    });

    process.env = { EMPTY_STRING: "" };
    const env = validateEnv(schema);
    expect(env.EMPTY_STRING).toBe("default");
  });

  test("validates empty arrays", () => {
    const schema = defineSchema({
      TAGS: {
        type: "array",
        items: { type: "string" },
      },
    });

    process.env = { TAGS: JSON.stringify([]) };
    const env = validateEnv(schema);
    expect(env.TAGS).toBeUndefined();
  });

  test("handles null in JSON parsing", () => {
    const schema = defineSchema({
      CONFIG: {
        type: "json",
      },
    });

    process.env = { CONFIG: "null" };
    const env = validateEnv(schema);
    expect(env.CONFIG).toBeUndefined();
  });
});
