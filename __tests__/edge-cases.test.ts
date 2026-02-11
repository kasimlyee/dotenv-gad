import { defineSchema, EnvValidator } from "../src/index.js";

describe("Edge Cases", () => {
  test("handles empty strings differently from undefined", () => {
    const schema = defineSchema({
      EMPTY_STRING: {
        type: "string",
        default: "default",
      },
    });

    const v = new EnvValidator(schema);
    const env = v.validate({ EMPTY_STRING: "" });
    expect(env.EMPTY_STRING).toBe("default");
  });

  test("handles undefined values with defaults", () => {
    const schema = defineSchema({
      MISSING: {
        type: "string",
        default: "fallback",
      },
    });

    const v = new EnvValidator(schema);
    const env = v.validate({});
    expect(env.MISSING).toBe("fallback");
  });

  test("validates empty arrays", () => {
    const schema = defineSchema({
      TAGS: {
        type: "array",
        items: { type: "string" },
      },
    });

    const v = new EnvValidator(schema);
    const env = v.validate({ TAGS: JSON.stringify([]) });
    expect(env.TAGS).toEqual([]);
  });

  test("handles null in JSON parsing", () => {
    const schema = defineSchema({
      CONFIG: {
        type: "json",
      },
    });

    const v = new EnvValidator(schema);
    const env = v.validate({ CONFIG: "null" });
    expect(env.CONFIG).toBeNull();
  });

  test("missing required variable throws", () => {
    const schema = defineSchema({
      REQUIRED_VAR: {
        type: "string",
        required: true,
      },
    });

    const v = new EnvValidator(schema);
    expect(() => v.validate({})).toThrow("REQUIRED_VAR");
  });

  test("multiple errors are aggregated", () => {
    const schema = defineSchema({
      A: { type: "string", required: true },
      B: { type: "number", required: true },
    });

    const v = new EnvValidator(schema);
    try {
      v.validate({});
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err.errors).toHaveLength(2);
      expect(err.errors.map((e: any) => e.key)).toEqual(
        expect.arrayContaining(["A", "B"]),
      );
    }
  });

  test("transform is applied before validation", () => {
    const schema = defineSchema({
      UPPER: {
        type: "string",
        transform: (v: string) => v.toUpperCase(),
        validate: (v) => v === v.toUpperCase(),
        error: "Must be uppercase",
      },
    });

    const v = new EnvValidator(schema);
    const env = v.validate({ UPPER: "hello" });
    expect(env.UPPER).toBe("HELLO");
  });

  test("date type coerces strings to Date objects", () => {
    const schema = defineSchema({
      LAUNCH_DATE: { type: "date" },
    });

    const v = new EnvValidator(schema);
    const env = v.validate({ LAUNCH_DATE: "2025-01-01" });
    expect(env.LAUNCH_DATE).toBeInstanceOf(Date);
    expect((env.LAUNCH_DATE as Date).getFullYear()).toBe(2025);
  });

  test("invalid date throws", () => {
    const schema = defineSchema({
      LAUNCH_DATE: { type: "date" },
    });

    const v = new EnvValidator(schema);
    expect(() => v.validate({ LAUNCH_DATE: "not-a-date" })).toThrow();
  });
});
