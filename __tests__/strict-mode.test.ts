import { AggregateError, defineSchema, EnvValidator } from "../src";

describe("Strict Mode Validation", () => {
  const schema = defineSchema({
    API_KEY: { type: "string" },
  });

  test("rejects extra environment variables", () => {
    process.env = { API_KEY: "123", EXTRA_VAR: "x" };
    const validator = new EnvValidator(schema, { strict: true });
    expect(() => validator.validate(process.env)).toThrow(
      "Environment validation failed: EXTRA_VAR"
    );
  });

  test("allows extra variables in non-strict mode", () => {
    process.env = { API_KEY: "123", EXTRA_VAR: "x" };
    const validator = new EnvValidator(schema);
    expect(() => validator.validate(process.env)).not.toThrow();
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
      process.env = { DB_PORT: "99999" };
      new EnvValidator(schema).validate(process.env);
    } catch (error: AggregateError | any) {
      expect(error.errors[0]).toMatchObject({
        key: "DB_PORT",
        message: "Must be between 1 and 65535",
        value: "99999",
      });
      expect(error.toString()).toContain("Database connection port");
    }
  });
});
