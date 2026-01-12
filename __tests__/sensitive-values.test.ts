import { defineSchema, EnvValidator, AggregateError } from "../src";

describe("sensitive and raw error reporting", () => {
  test("default: sensitive value is redacted", () => {
    const schema = defineSchema({
      SECRET_KEY: { type: "number", required: true, sensitive: true },
    });
    const v = new EnvValidator(schema);

    try {
      v.validate({ SECRET_KEY: "not-a-number" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(AggregateError);
      const agg = err as AggregateError;
      const secretError = agg.errors.find((e: any) => e.key === "SECRET_KEY");
      expect(secretError).toBeDefined();
      expect(secretError.value).toBe("****");
    }
  });

  test("includeRaw shows raw value for non-sensitive fields", () => {
    const schema = defineSchema({ NUM: { type: "number", required: true } });
    const v = new EnvValidator(schema, { includeRaw: true });

    try {
      v.validate({ NUM: "not-a-number" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(AggregateError);
      const agg = err as AggregateError;
      const numError = agg.errors.find((e: any) => e.key === "NUM");
      expect(numError).toBeDefined();
      expect(numError.value).toBe("not-a-number");
    }
  });

  test("includeRaw without includeSensitive keeps sensitive values redacted, but includeSensitive reveals them", () => {
    const schema = defineSchema({
      SECRET_KEY: { type: "number", required: true, sensitive: true },
    });

    const v1 = new EnvValidator(schema, { includeRaw: true });
    try {
      v1.validate({ SECRET_KEY: "not-a-number" });
      throw new Error("should have thrown");
    } catch (err: any) {
      const agg = err as AggregateError;
      const e = agg.errors.find((x: any) => x.key === "SECRET_KEY");
      expect(e.value).toBe("****");
    }

    const v2 = new EnvValidator(schema, { includeRaw: true, includeSensitive: true });
    try {
      v2.validate({ SECRET_KEY: "not-a-number" });
      throw new Error("should have thrown");
    } catch (err: any) {
      const agg = err as AggregateError;
      const e = agg.errors.find((x: any) => x.key === "SECRET_KEY");
      expect(e.value).toBe("not-a-number");
    }
  });
});
