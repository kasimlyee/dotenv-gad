import { describe, it, expect } from "vitest";
import { isBun, getEnv, getRuntimeName, getRuntimeVersion } from "../src/runtime";

describe("Runtime Detection", () => {
  it("should detect runtime correctly", () => {
    const runtime = getRuntimeName();
    expect(["Bun", "Node.js"]).toContain(runtime);
  });

  it("should return a runtime version", () => {
    const version = getRuntimeVersion();
    expect(version).toBeTruthy();
    expect(typeof version).toBe("string");
  });

  it("should provide environment variables", () => {
    const env = getEnv();
    expect(env).toBeDefined();
    expect(typeof env).toBe("object");
  });

  it("isBun should return a boolean", () => {
    const bunDetected = isBun();
    expect(typeof bunDetected).toBe("boolean");
  });

  it("getEnv should include NODE_ENV or allow it to be undefined", () => {
    const env = getEnv();
    // NODE_ENV can be undefined in test environments
    expect(env.NODE_ENV === undefined || typeof env.NODE_ENV === "string").toBe(true);
  });
});