import { defineSchema, loadEnv, createEnvProxy } from "../src";

describe("Utility Functions", () => {
  const schema = defineSchema({
    APP_NAME: {
      type: "string",
      default: "MyApp",
    },
  });

  test("loadEnv loads and validates", () => {
    process.env = {};
    const env = loadEnv(schema);
    expect(env.APP_NAME).toBe("MyApp");
  });

  test("createEnvProxy provides safe access", () => {
    const env = createEnvProxy({ APP_NAME: "TestApp" });
    expect(env.APP_NAME).toBe("TestApp");
    expect(() => (env as any)["NON_EXISTENT"]).toThrow(
      "Environment variable NON_EXISTENT is not validated"
    );
  });
});
