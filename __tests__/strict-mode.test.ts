import { EnvAggregateError, defineSchema, EnvValidator } from "../src/index.js";

describe("Strict Mode Validation", () => {
  const schema = defineSchema({
    API_KEY: { type: "string" },
  });

  test("rejects extra environment variables", () => {
    const validator = new EnvValidator(schema, { strict: true });
    expect(() =>
      validator.validate({ API_KEY: "123", EXTRA_VAR: "x" }),
    ).toThrow("Environment validation failed: EXTRA_VAR");
  });

  test("allows extra variables in non-strict mode", () => {
    const validator = new EnvValidator(schema);
    expect(() =>
      validator.validate({ API_KEY: "123", EXTRA_VAR: "x" }),
    ).not.toThrow();
  });
});

describe("Error Reporting", () => {
  const schema = defineSchema({
    DB_PORT: {
      type: "port",
      docs: "Database connection port",
      required: true,
    },
  });

  test("includes detailed error information", () => {
    try {
      new EnvValidator(schema).validate({ DB_PORT: "99999" });
      throw new Error("should have thrown");
    } catch (error: any) {
      expect(error).toBeInstanceOf(EnvAggregateError);
      expect(error.errors[0]).toMatchObject({
        key: "DB_PORT",
        message: "Must be between 1 and 65535",
        value: "99999",
      });
      expect(error.toString()).toContain("Database connection port");
    }
  });
});
