import { defineSchema, composeSchema, EnvValidator } from "../../src/index.js";

describe("composeSchema", () => {
  test("merges schemas correctly", () => {
    const schemaA = defineSchema({
      DB_URL: { type: "string" },
    });
    const schemaB = defineSchema({
      PORT: { type: "number" },
    });
    const merged = composeSchema(schemaA, schemaB);
    expect(merged).toHaveProperty("DB_URL");
    expect(merged).toHaveProperty("PORT");
  });

  test("later schemas override earlier ones for duplicate keys", () => {
    const schemaA = defineSchema({
      PORT: { type: "string", default: "3000" },
    });
    const schemaB = defineSchema({
      PORT: { type: "number", default: 8080 },
    });
    const merged = composeSchema(schemaA, schemaB);
    const v = new EnvValidator(merged);
    const result = v.validate({});
    expect(result.PORT).toBe(8080);
  });

  test("rejects prototype pollution keys", () => {
    const evil = { __proto__: { type: "string" } } as any;
    const safe = defineSchema({ APP: { type: "string" } });
    const merged = composeSchema(evil, safe);
    expect(merged).toHaveProperty("APP");
    expect(Object.getPrototypeOf(merged)).toBeNull();
  });

  test("filters constructor and prototype keys", () => {
    const schema = Object.create(null);
    schema["constructor"] = { type: "string" };
    schema["prototype"] = { type: "string" };
    schema["SAFE_KEY"] = { type: "string" };
    const merged = composeSchema(schema);
    expect("constructor" in merged).toBe(false);
    expect("prototype" in merged).toBe(false);
    expect(merged).toHaveProperty("SAFE_KEY");
  });

  test("composes three or more schemas", () => {
    const a = defineSchema({ A: { type: "string" } });
    const b = defineSchema({ B: { type: "number" } });
    const c = defineSchema({ C: { type: "boolean" } });
    const merged = composeSchema(a, b, c);
    expect(merged).toHaveProperty("A");
    expect(merged).toHaveProperty("B");
    expect(merged).toHaveProperty("C");
  });
});
