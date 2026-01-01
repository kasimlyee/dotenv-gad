import path from "path";
import { fileURLToPath } from "url";
import { loadSchema } from "../src/cli/commands/utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("loadSchema (ESM + Windows-safe)", () => {
  const fixturesDir = path.resolve(__dirname, "fixtures");

  test("loads JSON schema using absolute path", async () => {
    const schemaPath = path.join(fixturesDir, "schema.json");
    const schema = await loadSchema(schemaPath);
    expect(schema).toHaveProperty("VITE_APP_TITLE");
  });

  test("loads JS schema using absolute path", async () => {
    const schemaPath = path.join(fixturesDir, "schema.js");
    const schema = await loadSchema(schemaPath);
    expect(schema).toHaveProperty("VITE_API_URL");
  });

  test("loads TS schema using absolute path (Windows-safe)", async () => {
    const schemaPath = path.join(fixturesDir, "schema.ts");
    await expect(loadSchema(schemaPath)).resolves.toHaveProperty(
      "VITE_DEBUG_MODE"
    );
  });

  test("does not throw Windows ESM protocol error", async () => {
    const schemaPath = path.join(fixturesDir, "schema.ts");

    try {
      await loadSchema(schemaPath);
    } catch (err: any) {
      expect(err.message).not.toContain("Received protocol 'f:'");
      throw err;
    }
  });
});
