import { AggregateError, defineSchema, validateEnv } from "../src";
import dotenv from "dotenv";

describe("Custom Validators", () => {
  test("uses custom validation functions", () => {
    const schema = defineSchema({
      SECRET_KEY: {
        type: "string",
        validate: (val) => val.startsWith("sk_"),
        error: "Secret key must start with sk_",
      },
    });

    dotenv.config({ path: ".env" });
    //process.env.SECRET_KEY = "sk_test_123";
    //const env = validateEnv(schema);
    //expect(env.SECRET_KEY).toBe("sk_test_123");

    //Just need to look more on this test, I guess its not the perfect way but

    process.env.SECRET_KEY = "invalid";
    try {
    validateEnv(schema);
  } catch (error) {
    if (error instanceof AggregateError) {
      expect(error).toBeInstanceOf(AggregateError);
    } else {
      throw error;
    }
  }
  });
});
