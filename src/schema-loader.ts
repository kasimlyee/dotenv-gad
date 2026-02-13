/**
 * Standalone schema loader.
 *
 * Deliberately free of CLI-only dependencies (chalk, inquirer) so it can be
 * imported by the Vite plugin without pulling in heavy Node packages.
 *
 * esbuild is required only when loading `.ts` schemas and is imported
 * lazily via `await import("esbuild")` so the module itself has no
 * top-level dependency on it.
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { randomBytes } from "crypto";
import type { SchemaDefinition } from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function importModule(filePath: string): Promise<SchemaDefinition> {
  const fileUrl = pathToFileURL(filePath).href;
  const imported = await import(`${fileUrl}?t=${Date.now()}`);
  const schema = imported.default || imported.schema || imported;

  if (!schema || typeof schema !== "object") {
    throw new Error(
      `Schema not found. Ensure you 'export default' or 'export const schema' in your file.`
    );
  }

  return schema;
}

async function loadTsModule(tsFilePath: string): Promise<SchemaDefinition> {
  const tempFile = join(
    __dirname,
    `../temp-schema-${randomBytes(8).toString("hex")}.mjs`
  );
  try {
    const { transformSync } = await import("esbuild");
    const tsCode = readFileSync(tsFilePath, "utf-8");
    const { code } = transformSync(tsCode, {
      format: "esm",
      loader: "ts",
      target: "esnext",
    });
    writeFileSync(tempFile, code);
    return await importModule(tempFile);
  } finally {
    if (existsSync(tempFile)) {
      unlinkSync(tempFile);
    }
  }
}

/**
 * Loads a schema from a file.
 *
 * Supports `.ts`, `.js`, `.mjs`, `.cjs`, and `.json` formats.
 * TypeScript files are transpiled on-the-fly via esbuild (loaded lazily).
 */
export async function loadSchema(
  schemaPath: string
): Promise<SchemaDefinition> {
  const absPath = resolve(schemaPath);

  try {
    if (absPath.endsWith(".ts")) {
      return await loadTsModule(absPath);
    } else if (
      absPath.endsWith(".js") ||
      absPath.endsWith(".mjs") ||
      absPath.endsWith(".cjs")
    ) {
      return await importModule(absPath);
    } else if (absPath.endsWith(".json")) {
      return JSON.parse(readFileSync(absPath, "utf-8"));
    }
    throw new Error(`Unsupported schema format. Use .ts, .js or .json`);
  } catch (error) {
    throw new Error(
      `Failed to load schema from ${schemaPath}: ${(error as Error).message}`
    );
  }
}
