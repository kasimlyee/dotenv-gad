import { AggregateError, defineSchema, validateEnv } from "../src";

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
      validate: (val) => typeof val === "object",
    },
  });

  beforeAll(() => {
    process.env = {
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
  });

  test("validates URL type", () => {
    process.env.API_URL = "not-a-url";
    expect(() => validateEnv(schema)).toThrow(AggregateError);
    process.env.API_URL = "https://api.example.com/v1";
  });

  test("validates email type", () => {
    process.env.SUPPORT_EMAIL = "invalid-email";
    expect(() => validateEnv(schema)).toThrow(AggregateError);
    process.env.SUPPORT_EMAIL = "support@example.com";
  });

  test("validates IP array", () => {
    process.env.SERVER_IPS = JSON.stringify(["invalid-ip"]);
    expect(() => validateEnv(schema)).toThrow(AggregateError);
    process.env.SERVER_IPS = JSON.stringify(["192.168.1.1", "10.0.0.1"]);
  });

  test("validates nested object structure", () => {
    process.env.DB_CONFIG = JSON.stringify({ port: "99999" });
    expect(() => validateEnv(schema)).toThrow(AggregateError);
    process.env.DB_CONFIG = JSON.stringify({
      host: "localhost",
      port: "5432",
      ssl: "true",
    });
  });

  test("validates JSON content", () => {
    process.env.METRICS_CONFIG = "invalid-json";
    expect(() => validateEnv(schema)).toThrow(AggregateError);
    process.env.METRICS_CONFIG = JSON.stringify({
      interval: 5000,
      enabled: true,
    });
  });
});
