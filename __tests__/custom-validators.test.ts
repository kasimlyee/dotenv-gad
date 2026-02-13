import { EnvAggregateError, defineSchema, EnvValidator } from "../src/index.js";

describe("Custom Validators", () => {
  test("accepts value passing custom validation", () => {
    const schema = defineSchema({
      SECRET_KEY: {
        type: "string",
        validate: (val) => val.startsWith("sk_"),
        error: "Secret key must start with sk_",
      },
    });

    const v = new EnvValidator(schema);
    const result = v.validate({ SECRET_KEY: "sk_test_123" });
    expect(result.SECRET_KEY).toBe("sk_test_123");
  });

  test("rejects value failing custom validation", () => {
    const schema = defineSchema({
      SECRET_KEY: {
        type: "string",
        validate: (val) => val.startsWith("sk_"),
        error: "Secret key must start with sk_",
      },
    });

    const v = new EnvValidator(schema);
    expect(() => v.validate({ SECRET_KEY: "invalid" })).toThrow(
      EnvAggregateError,
    );
  });

  test("custom error message appears in thrown error", () => {
    const schema = defineSchema({
      SECRET_KEY: {
        type: "string",
        validate: (val) => val.startsWith("sk_"),
        error: "Secret key must start with sk_",
      },
    });

    const v = new EnvValidator(schema);
    try {
      v.validate({ SECRET_KEY: "invalid" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      const agg = err as EnvAggregateError;
      expect(agg.errors[0].message).toBe("Secret key must start with sk_");
    }
  });

  test("regex validation works", () => {
    const schema = defineSchema({
      APP_VERSION: {
        type: "string",
        regex: /^\d+\.\d+\.\d+$/,
        regexError: "Must be a semver string (e.g. 1.0.0)",
      },
    });

    const v = new EnvValidator(schema);
    expect(v.validate({ APP_VERSION: "1.2.3" }).APP_VERSION).toBe("1.2.3");
    expect(() => v.validate({ APP_VERSION: "not-semver" })).toThrow(
      EnvAggregateError,
    );
  });

  test("enum validation works", () => {
    const schema = defineSchema({
      LOG_LEVEL: {
        type: "string",
        enum: ["debug", "info", "warn", "error"],
      },
    });

    const v = new EnvValidator(schema);
    expect(v.validate({ LOG_LEVEL: "info" }).LOG_LEVEL).toBe("info");
    expect(() => v.validate({ LOG_LEVEL: "verbose" })).toThrow(
      EnvAggregateError,
    );
  });
});
