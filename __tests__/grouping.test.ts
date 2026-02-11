import { defineSchema, EnvValidator, EnvAggregateError } from "../src/index.js";

describe("grouped env variables (envPrefix)", () => {
  test("maps prefixed envs into an object", () => {
    const schema = defineSchema({
      DATABASE: {
        type: "object",
        properties: {
          DB_NAME: { type: "string", required: true },
          PORT: { type: "port", default: 5432 },
          PWD: { type: "string", sensitive: true },
        },
      },
    });

    const env = {
      DATABASE_DB_NAME: "mydb",
      DATABASE_PORT: "5432",
      DATABASE_PWD: "supersecret",
    };

    const v = new EnvValidator(schema);
    const validated = v.validate(env);

    expect(validated.DATABASE).toBeDefined();
    expect(validated.DATABASE.DB_NAME).toBe("mydb");
    expect(validated.DATABASE.PORT).toBe(5432);
    expect(validated.DATABASE.PWD).toBe("supersecret");
  });

  test("prefixed variables take precedence over top-level JSON and warn", () => {
    const schema = defineSchema({
      DATABASE: {
        type: "object",
        properties: { DB_NAME: { type: "string" } },
      },
    });

    const env = {
      DATABASE: JSON.stringify({ DB_NAME: "jsondb" }),
      DATABASE_DB_NAME: "prefdb",
    };

    const originalWarn = console.warn;
    let wasWarned = false;
    console.warn = () => {
      wasWarned = true;
    };
    const v = new EnvValidator(schema);
    const validated = v.validate(env);
    expect(validated.DATABASE.DB_NAME).toBe("prefdb");
    expect(wasWarned).toBe(true);
    console.warn = originalWarn;
  });

  test("strict mode flags unexpected grouped properties", () => {
    const schema = defineSchema({
      DATABASE: {
        type: "object",
        properties: { DB_NAME: { type: "string" } },
      },
    });

    const env = {
      DATABASE_DB_NAME: "mydb",
      DATABASE_EXTRA: "unexpected",
    };

    const v = new EnvValidator(schema, { strict: true });
    expect(() => v.validate(env)).toThrow();
  });

  test("includeRaw shows raw grouped values when enabled", () => {
    const schema = defineSchema({
      DATABASE: {
        type: "object",
        properties: { DB_NAME: { type: "number" } },
      },
    });

    const v = new EnvValidator(schema, { includeRaw: true });
    try {
      v.validate({ DATABASE_DB_NAME: "not-a-number" });
      throw new Error("should have thrown");
    } catch (err: any) {
      const agg = err as EnvAggregateError;
      const e = agg.errors.find((x: any) => x.key === "DATABASE");
      expect(e).toBeDefined();
    }
  });
});
