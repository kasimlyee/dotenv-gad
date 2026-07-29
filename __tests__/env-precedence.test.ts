/**
 * Issue #61: .env file values must not override real environment variables.
 * Following dotenv conventions, the file provides defaults and the real
 * environment wins, unless `override: true` is passed explicitly.
 */
import { describe, test, expect, beforeAll, afterAll, afterEach } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineSchema, loadEnv, validateEnv } from "../src/index.js";
import { mergeEnv } from "../src/utils.js";

const TMP = join(__dirname, ".fixtures-precedence");
const ENV_PATH = join(TMP, ".env");

beforeAll(() => {
  mkdirSync(TMP, { recursive: true });
  writeFileSync(ENV_PATH, "PRECEDENCE_LOG_LEVEL=debug\nPRECEDENCE_FILE_ONLY=from-file\n");
});
afterAll(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true });
});
afterEach(() => {
  delete process.env.PRECEDENCE_LOG_LEVEL;
});

const schema = defineSchema({
  PRECEDENCE_LOG_LEVEL: { type: "string", default: "info" },
  PRECEDENCE_FILE_ONLY: { type: "string" },
});

describe("mergeEnv", () => {
  test("runtime environment wins over file values by default", () => {
    expect(mergeEnv({ A: "file" }, { A: "runtime" })).toEqual({ A: "runtime" });
  });

  test("file value fills in when the runtime variable is unset", () => {
    expect(mergeEnv({ A: "file" }, {})).toEqual({ A: "file" });
  });

  test("an undefined runtime entry does not clobber a file value", () => {
    expect(mergeEnv({ A: "file" }, { A: undefined })).toEqual({ A: "file" });
  });

  test("override: true lets file values replace runtime variables", () => {
    expect(mergeEnv({ A: "file" }, { A: "runtime" }, true)).toEqual({
      A: "file",
    });
  });
});

describe("loadEnv precedence (issue #61)", () => {
  test("real environment variable beats the .env file value", () => {
    process.env.PRECEDENCE_LOG_LEVEL = "error";
    const env = loadEnv(schema, { path: ENV_PATH });
    expect(env.PRECEDENCE_LOG_LEVEL).toBe("error");
    expect(env.PRECEDENCE_FILE_ONLY).toBe("from-file");
  });

  test(".env file value is used when the variable is not set", () => {
    const env = loadEnv(schema, { path: ENV_PATH });
    expect(env.PRECEDENCE_LOG_LEVEL).toBe("debug");
  });

  test("override: true restores file-wins behavior", () => {
    process.env.PRECEDENCE_LOG_LEVEL = "error";
    const env = loadEnv(schema, { path: ENV_PATH, override: true });
    expect(env.PRECEDENCE_LOG_LEVEL).toBe("debug");
  });
});

describe("validateEnv precedence (issue #61)", () => {
  test("real environment variable beats the .env file value", () => {
    process.env.PRECEDENCE_LOG_LEVEL = "error";
    const env = validateEnv(schema, { path: ENV_PATH });
    expect(env.PRECEDENCE_LOG_LEVEL).toBe("error");
  });

  test("override: true restores file-wins behavior", () => {
    process.env.PRECEDENCE_LOG_LEVEL = "error";
    const env = validateEnv(schema, { path: ENV_PATH, override: true });
    expect(env.PRECEDENCE_LOG_LEVEL).toBe("debug");
  });
});