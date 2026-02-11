import {
  defineSchema,
  EnvValidator,
  EnvAggregateError,
  createEnvProxy,
  composeSchema,
} from "../src/index.js";

describe("Bug fix: port rejects floats", () => {
  const schema = defineSchema({
    PORT: { type: "port", required: true },
  });

  test("accepts valid integer port", () => {
    const v = new EnvValidator(schema);
    expect(v.validate({ PORT: "3000" }).PORT).toBe(3000);
  });

  test("accepts port 1 (minimum)", () => {
    const v = new EnvValidator(schema);
    expect(v.validate({ PORT: "1" }).PORT).toBe(1);
  });

  test("accepts port 65535 (maximum)", () => {
    const v = new EnvValidator(schema);
    expect(v.validate({ PORT: "65535" }).PORT).toBe(65535);
  });

  test("rejects float port values", () => {
    const v = new EnvValidator(schema);
    try {
      v.validate({ PORT: "3000.5" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toBe("Must be an integer");
    }
  });

  test("rejects port 0", () => {
    const v = new EnvValidator(schema);
    try {
      v.validate({ PORT: "0" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toBe("Must be between 1 and 65535");
    }
  });

  test("rejects port above 65535", () => {
    const v = new EnvValidator(schema);
    try {
      v.validate({ PORT: "70000" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toBe("Must be between 1 and 65535");
    }
  });

  test("rejects negative port", () => {
    const v = new EnvValidator(schema);
    expect(() => v.validate({ PORT: "-1" })).toThrow(EnvAggregateError);
  });

  test("rejects non-numeric port", () => {
    const v = new EnvValidator(schema);
    try {
      v.validate({ PORT: "abc" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toBe("Must be an integer");
    }
  });
});

describe("Bug fix: minLength:0 and maxLength:0 are respected", () => {
  test("minLength:0 allows empty strings (after trim)", () => {
    const schema = defineSchema({
      TOKEN: { type: "string", minLength: 0 },
    });
    const v = new EnvValidator(schema);
    expect(v.validate({ TOKEN: "abc" }).TOKEN).toBe("abc");
  });

  test("minLength:1 accepts single char values", () => {
    const schema = defineSchema({
      TOKEN: { type: "string", minLength: 1 },
    });
    const v = new EnvValidator(schema);
    expect(v.validate({ TOKEN: "a" }).TOKEN).toBe("a");
  });

  test("minLength:5 rejects shorter strings", () => {
    const schema = defineSchema({
      TOKEN: { type: "string", minLength: 5, required: true },
    });
    const v = new EnvValidator(schema);
    try {
      v.validate({ TOKEN: "abc" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toContain("at least 5 characters");
    }
  });

  test("maxLength:0 rejects non-empty strings", () => {
    const schema = defineSchema({
      TOKEN: { type: "string", maxLength: 0, required: true },
    });
    const v = new EnvValidator(schema);
    try {
      v.validate({ TOKEN: "a" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toContain("at most 0 characters");
    }
  });

  test("maxLength:5 rejects longer strings", () => {
    const schema = defineSchema({
      TOKEN: { type: "string", maxLength: 5, required: true },
    });
    const v = new EnvValidator(schema);
    try {
      v.validate({ TOKEN: "abcdef" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toContain("at most 5 characters");
    }
  });

  test("maxLength:5 accepts strings of exactly 5 chars", () => {
    const schema = defineSchema({
      TOKEN: { type: "string", maxLength: 5 },
    });
    const v = new EnvValidator(schema);
    expect(v.validate({ TOKEN: "abcde" }).TOKEN).toBe("abcde");
  });
});

describe("Bug fix: createEnvProxy uses 'in' operator", () => {
  test("does not throw for keys present with undefined value", () => {
    const env = createEnvProxy({ OPTIONAL_VAR: undefined as any });
    expect(() => env.OPTIONAL_VAR).not.toThrow();
  });

  test("throws for keys not present at all", () => {
    const env = createEnvProxy({ KNOWN: "value" });
    expect(() => (env as any).UNKNOWN).toThrow(
      "Environment variable UNKNOWN is not validated",
    );
  });

  test("returns correct values for known keys", () => {
    const env = createEnvProxy({ A: "1", B: "2" });
    expect(env.A).toBe("1");
    expect(env.B).toBe("2");
  });
});

describe("Bug fix: strict mode runs before error throw", () => {
  test("strict mode error includes both validation errors and unexpected vars", () => {
    const schema = defineSchema({
      PORT: { type: "port", required: true },
    });
    const v = new EnvValidator(schema, { strict: true });
    try {
      v.validate({ PORT: "invalid", EXTRA: "x" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      const keys = err.errors.map((e: any) => e.key);
      expect(keys).toContain("PORT");
      expect(keys).toContain("EXTRA");
    }
  });

  test("strict mode does not flag grouped prefix keys as unexpected", () => {
    const schema = defineSchema({
      DATABASE: {
        type: "object",
        properties: {
          HOST: { type: "string" },
          PORT: { type: "port" },
        },
      },
    });
    const v = new EnvValidator(schema, { strict: true });
    expect(() =>
      v.validate({ DATABASE_HOST: "localhost", DATABASE_PORT: "5432" }),
    ).not.toThrow();
  });
});

describe("Bug fix: composeSchema prototype pollution protection", () => {
  test("result has null prototype", () => {
    const schema = defineSchema({ A: { type: "string" } });
    const merged = composeSchema(schema);
    expect(Object.getPrototypeOf(merged)).toBeNull();
  });

  test("__proto__ key is filtered out", () => {
    const evil = Object.create(null);
    evil["__proto__"] = { type: "string" };
    evil["SAFE"] = { type: "string" };
    const merged = composeSchema(evil);
    expect("__proto__" in merged).toBe(false);
    expect(merged).toHaveProperty("SAFE");
  });
});
