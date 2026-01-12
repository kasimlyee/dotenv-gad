import { defineSchema, EnvValidator, AggregateError } from "../src";

describe("sensitive value redaction", () => {
  test("error value is redacted when rule.sensitive is true", () => {
    const schema = defineSchema({
      // set type to number to force a parse error for this test
      SECRET_KEY: { type: "number", required: true, sensitive: true },
      OTHER: { type: "number" },
    });

    const v = new EnvValidator(schema);

    try {
      v.validate({ SECRET_KEY: "not-a-number", OTHER: "42" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(AggregateError);
      const agg = err as AggregateError;
      // ensure the first error is for SECRET_KEY and its value is redacted
      const secretError = agg.errors.find((e: any) => e.key === "SECRET_KEY");
      expect(secretError).toBeDefined();
      expect(secretError.value).toBe("****");
    }
  });
});
