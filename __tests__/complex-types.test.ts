import { EnvAggregateError, defineSchema, EnvValidator } from "../src/index.js";

describe("Complex Type Validation", () => {
  const schema = defineSchema({
    API_URL: {
      type: "url",
      required: true,
    },
    SUPPORT_EMAIL: {
      type: "email",
      required: true,
    },
    SERVER_IPS: {
      type: "array",
      items: { type: "ip" },
    },
    DB_CONFIG: {
      type: "object",
      properties: {
        host: { type: "string" },
        port: { type: "port" },
        ssl: { type: "boolean" },
      },
    },
    METRICS_CONFIG: {
      type: "json",
      validate: (val: any) => typeof val === "object",
    },
  });

  const validEnv = {
    API_URL: "https://api.example.com/v1",
    SUPPORT_EMAIL: "support@example.com",
    SERVER_IPS: JSON.stringify(["192.168.1.1", "10.0.0.1"]),
    DB_CONFIG: JSON.stringify({
      host: "localhost",
      port: "5432",
      ssl: "true",
    }),
    METRICS_CONFIG: JSON.stringify({
      interval: 5000,
      enabled: true,
    }),
  };

  test("validates all complex types with valid input", () => {
    const v = new EnvValidator(schema);
    const result = v.validate(validEnv);
    expect(result.API_URL).toBe("https://api.example.com/v1");
    expect(result.SUPPORT_EMAIL).toBe("support@example.com");
    expect(result.SERVER_IPS).toEqual(["192.168.1.1", "10.0.0.1"]);
    expect(result.DB_CONFIG).toEqual({ host: "localhost", port: 5432, ssl: true });
    expect(result.METRICS_CONFIG).toEqual({ interval: 5000, enabled: true });
  });

  test("validates URL type", () => {
    const v = new EnvValidator(schema);
    expect(() => v.validate({ ...validEnv, API_URL: "not-a-url" })).toThrow(
      EnvAggregateError,
    );
  });

  test("validates email type", () => {
    const v = new EnvValidator(schema);
    expect(() =>
      v.validate({ ...validEnv, SUPPORT_EMAIL: "invalid-email" }),
    ).toThrow(EnvAggregateError);
  });

  test("validates IP array", () => {
    const v = new EnvValidator(schema);
    expect(() =>
      v.validate({
        ...validEnv,
        SERVER_IPS: JSON.stringify(["invalid-ip"]),
      }),
    ).toThrow(EnvAggregateError);
  });

  test("validates nested object structure", () => {
    const v = new EnvValidator(schema);
    expect(() =>
      v.validate({
        ...validEnv,
        DB_CONFIG: JSON.stringify({ port: "99999" }),
      }),
    ).toThrow(EnvAggregateError);
  });

  test("validates JSON content", () => {
    const v = new EnvValidator(schema);
    expect(() =>
      v.validate({ ...validEnv, METRICS_CONFIG: "invalid-json" }),
    ).toThrow(EnvAggregateError);
  });
});
