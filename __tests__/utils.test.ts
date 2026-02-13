import { createEnvProxy } from "../src/index.js";

describe("Utility Functions", () => {
  test("createEnvProxy provides safe access", () => {
    const env = createEnvProxy({ APP_NAME: "TestApp" });
    expect(env.APP_NAME).toBe("TestApp");
    expect(() => (env as any)["NON_EXISTENT"]).toThrow(
      "Environment variable NON_EXISTENT is not validated",
    );
  });

  test("createEnvProxy allows access to keys with undefined values", () => {
    const env = createEnvProxy({ OPTIONAL: undefined as any });
    expect(() => env.OPTIONAL).not.toThrow();
    expect(env.OPTIONAL).toBeUndefined();
  });

  test("createEnvProxy does not throw for symbol access", () => {
    const env = createEnvProxy({ APP_NAME: "TestApp" });
    expect(() => (env as any)[Symbol.toPrimitive]).not.toThrow();
  });
});
