import { defineSchema, EnvValidator, EnvAggregateError } from "../src/index.js";

describe("Boolean coercion", () => {
  const schema = defineSchema({
    ENABLED: { type: "boolean" },
  });

  test("coerces 'true' string to true", () => {
    const v = new EnvValidator(schema);
    expect(v.validate({ ENABLED: "true" }).ENABLED).toBe(true);
  });

  test("coerces 'false' string to false", () => {
    const v = new EnvValidator(schema);
    expect(v.validate({ ENABLED: "false" }).ENABLED).toBe(false);
  });

  test("coerces 'TRUE' (uppercase) to true", () => {
    const v = new EnvValidator(schema);
    expect(v.validate({ ENABLED: "TRUE" }).ENABLED).toBe(true);
  });

  test("coerces 'False' (mixed case) to false", () => {
    const v = new EnvValidator(schema);
    expect(v.validate({ ENABLED: "False" }).ENABLED).toBe(false);
  });

  test("rejects non-boolean strings like 'yes'", () => {
    const v = new EnvValidator(schema);
    expect(() => v.validate({ ENABLED: "yes" })).toThrow(EnvAggregateError);
  });

  test("rejects '1' as boolean", () => {
    const v = new EnvValidator(schema);
    expect(() => v.validate({ ENABLED: "1" })).toThrow(EnvAggregateError);
  });
});

describe("Number validation", () => {
  test("coerces valid numeric strings", () => {
    const schema = defineSchema({ COUNT: { type: "number" } });
    const v = new EnvValidator(schema);
    expect(v.validate({ COUNT: "42" }).COUNT).toBe(42);
  });

  test("accepts negative numbers", () => {
    const schema = defineSchema({ OFFSET: { type: "number" } });
    const v = new EnvValidator(schema);
    expect(v.validate({ OFFSET: "-10" }).OFFSET).toBe(-10);
  });

  test("accepts floats", () => {
    const schema = defineSchema({ RATE: { type: "number" } });
    const v = new EnvValidator(schema);
    expect(v.validate({ RATE: "3.14" }).RATE).toBeCloseTo(3.14);
  });

  test("rejects NaN-producing strings", () => {
    const schema = defineSchema({ COUNT: { type: "number", required: true } });
    const v = new EnvValidator(schema);
    expect(() => v.validate({ COUNT: "not-a-number" })).toThrow(
      EnvAggregateError,
    );
  });

  test("enforces min constraint", () => {
    const schema = defineSchema({ AGE: { type: "number", min: 0 } });
    const v = new EnvValidator(schema);
    try {
      v.validate({ AGE: "-1" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toContain("at least 0");
    }
  });

  test("enforces max constraint", () => {
    const schema = defineSchema({ AGE: { type: "number", max: 120 } });
    const v = new EnvValidator(schema);
    try {
      v.validate({ AGE: "200" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toContain("at most 120");
    }
  });

  test("min and max together", () => {
    const schema = defineSchema({
      TEMP: { type: "number", min: -40, max: 50 },
    });
    const v = new EnvValidator(schema);
    expect(v.validate({ TEMP: "25" }).TEMP).toBe(25);
    expect(() => v.validate({ TEMP: "-50" })).toThrow(EnvAggregateError);
    expect(() => v.validate({ TEMP: "60" })).toThrow(EnvAggregateError);
  });
});

describe("String validation details", () => {
  test("trims whitespace from string values", () => {
    const schema = defineSchema({ NAME: { type: "string" } });
    const v = new EnvValidator(schema);
    expect(v.validate({ NAME: "  hello  " }).NAME).toBe("hello");
  });

  test("minLength check happens after trim", () => {
    const schema = defineSchema({
      TOKEN: { type: "string", minLength: 3, required: true },
    });
    const v = new EnvValidator(schema);
    try {
      v.validate({ TOKEN: "  ab  " });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toContain("at least 3");
    }
  });
});

describe("URL validation", () => {
  test("accepts valid HTTP URL", () => {
    const schema = defineSchema({ ENDPOINT: { type: "url" } });
    const v = new EnvValidator(schema);
    expect(v.validate({ ENDPOINT: "http://example.com" }).ENDPOINT).toBe(
      "http://example.com",
    );
  });

  test("accepts valid HTTPS URL", () => {
    const schema = defineSchema({ ENDPOINT: { type: "url" } });
    const v = new EnvValidator(schema);
    expect(
      v.validate({ ENDPOINT: "https://api.example.com/path" }).ENDPOINT,
    ).toBe("https://api.example.com/path");
  });

  test("rejects invalid URL", () => {
    const schema = defineSchema({
      ENDPOINT: { type: "url", required: true },
    });
    const v = new EnvValidator(schema);
    try {
      v.validate({ ENDPOINT: "not-a-url" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toBe("Must be a valid URL");
    }
  });
});

describe("Email validation", () => {
  test("accepts valid email", () => {
    const schema = defineSchema({ EMAIL: { type: "email" } });
    const v = new EnvValidator(schema);
    expect(v.validate({ EMAIL: "user@example.com" }).EMAIL).toBe(
      "user@example.com",
    );
  });

  test("rejects email without @", () => {
    const schema = defineSchema({ EMAIL: { type: "email", required: true } });
    const v = new EnvValidator(schema);
    try {
      v.validate({ EMAIL: "invalid" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(EnvAggregateError);
      expect(err.errors[0].message).toBe("Must be a valid email");
    }
  });

  test("rejects email without domain", () => {
    const schema = defineSchema({ EMAIL: { type: "email", required: true } });
    const v = new EnvValidator(schema);
    expect(() => v.validate({ EMAIL: "user@" })).toThrow(EnvAggregateError);
  });
});

describe("IP validation", () => {
  test("accepts valid IPv4", () => {
    const schema = defineSchema({ IP: { type: "ip" } });
    const v = new EnvValidator(schema);
    expect(v.validate({ IP: "192.168.1.1" }).IP).toBe("192.168.1.1");
  });

  test("rejects invalid IP", () => {
    const schema = defineSchema({ IP: { type: "ip", required: true } });
    const v = new EnvValidator(schema);
    expect(() => v.validate({ IP: "999.999.999.999" })).toThrow(
      EnvAggregateError,
    );
  });

  test("accepts valid IPv6 loopback (::1)", () => {
    const schema = defineSchema({ IP: { type: "ip", required: true } });
    const v = new EnvValidator(schema);
    expect(v.validate({ IP: "::1" })).toMatchObject({ IP: "::1" });
  });

  test("accepts full IPv6 address", () => {
    const schema = defineSchema({ IP: { type: "ip", required: true } });
    const v = new EnvValidator(schema);
    expect(v.validate({ IP: "2001:db8::1" })).toMatchObject({ IP: "2001:db8::1" });
  });
});

describe("Array validation", () => {
  test("parses JSON array string", () => {
    const schema = defineSchema({
      HOSTS: { type: "array", items: { type: "string" } },
    });
    const v = new EnvValidator(schema);
    const result = v.validate({
      HOSTS: JSON.stringify(["a.com", "b.com"]),
    });
    expect(result.HOSTS).toEqual(["a.com", "b.com"]);
  });

  test("validates each item in array", () => {
    const schema = defineSchema({
      PORTS: { type: "array", items: { type: "port" } },
    });
    const v = new EnvValidator(schema);
    expect(() =>
      v.validate({ PORTS: JSON.stringify([80, 99999]) }),
    ).toThrow(EnvAggregateError);
  });

  test("rejects non-array JSON", () => {
    const schema = defineSchema({
      ITEMS: { type: "array", required: true },
    });
    const v = new EnvValidator(schema);
    expect(() => v.validate({ ITEMS: '{"key":"val"}' })).toThrow(
      EnvAggregateError,
    );
  });
});

describe("Object type with nested properties", () => {
  test("validates nested required properties", () => {
    const schema = defineSchema({
      DB: {
        type: "object",
        properties: {
          HOST: { type: "string", required: true },
          PORT: { type: "port", required: true },
        },
      },
    });
    const v = new EnvValidator(schema);
    expect(() =>
      v.validate({ DB: JSON.stringify({ HOST: "localhost" }) }),
    ).toThrow(EnvAggregateError);
  });

  test("applies defaults to nested properties", () => {
    const schema = defineSchema({
      DB: {
        type: "object",
        properties: {
          HOST: { type: "string", default: "localhost" },
          PORT: { type: "port", default: 5432 },
        },
      },
    });
    const v = new EnvValidator(schema);
    const result = v.validate({ DB: JSON.stringify({}) });
    expect(result.DB.HOST).toBe("localhost");
    expect(result.DB.PORT).toBe(5432);
  });
});

describe("Default values", () => {
  test("uses default when value is undefined", () => {
    const schema = defineSchema({
      MODE: { type: "string", default: "development" },
    });
    const v = new EnvValidator(schema);
    expect(v.validate({}).MODE).toBe("development");
  });

  test("uses default when value is empty string", () => {
    const schema = defineSchema({
      MODE: { type: "string", default: "development" },
    });
    const v = new EnvValidator(schema);
    expect(v.validate({ MODE: "" }).MODE).toBe("development");
  });

  test("provided value overrides default", () => {
    const schema = defineSchema({
      MODE: { type: "string", default: "development" },
    });
    const v = new EnvValidator(schema);
    expect(v.validate({ MODE: "production" }).MODE).toBe("production");
  });

  test("numeric default is returned as-is", () => {
    const schema = defineSchema({
      RETRIES: { type: "number", default: 3 },
    });
    const v = new EnvValidator(schema);
    expect(v.validate({}).RETRIES).toBe(3);
  });
});

describe("EnvAggregateError", () => {
  test("toString includes docs string", () => {
    const schema = defineSchema({
      API_KEY: {
        type: "string",
        required: true,
        docs: "Your API key from the dashboard",
      },
    });
    const v = new EnvValidator(schema);
    try {
      v.validate({});
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err.toString()).toContain("Your API key from the dashboard");
    }
  });

  test("error has correct name property", () => {
    const schema = defineSchema({ X: { type: "string", required: true } });
    const v = new EnvValidator(schema);
    try {
      v.validate({});
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err.name).toBe("EnvAggregateError");
    }
  });

  test("long values are truncated in default error reporting", () => {
    const schema = defineSchema({
      DATA: { type: "number", required: true },
    });
    const v = new EnvValidator(schema);
    const longValue = "a".repeat(100);
    try {
      v.validate({ DATA: longValue });
      throw new Error("should have thrown");
    } catch (err: any) {
      const dataErr = err.errors.find((e: any) => e.key === "DATA");
      expect(dataErr.value.length).toBeLessThan(longValue.length);
      expect(dataErr.value).toContain("...");
    }
  });
});
