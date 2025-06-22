import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { transformSync } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadSchema(schemaPath: string) {
  try {
    if (schemaPath.endsWith(".ts")) {
      const code = readFileSync(schemaPath, "utf-8");
      const result = transformSync(code, {
        format: "esm",
        loader: "ts",
        target: "esnext",
      });

      // Create temporary file
      const tempFile = join(__dirname, "../../temp-schema.mjs");
      writeFileSync(tempFile, result.code);

      try {
        // Import with query string to bust cache
        const module = await import(`${tempFile}?t=${Date.now()}`);
        return module.default;
      } finally {
        // Clean up temp file
        unlinkSync(tempFile);
      }
    } else if (schemaPath.endsWith(".js")) {
      const module = await import(schemaPath);
      return module.default;
    } else if (schemaPath.endsWith(".json")) {
      return JSON.parse(readFileSync(schemaPath, "utf-8"));
    }
    throw new Error("Unsupported schema format. Use .ts, .js or .json");
  } catch (error) {
    throw new Error(`Failed to load schema: ${(error as Error).message}`);
  }
}
