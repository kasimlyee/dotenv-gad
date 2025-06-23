import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { transformSync } from "esbuild";
import { SchemaDefinition, SchemaRule } from "../../schema.js";
import Chalk from "chalk";
import inquirer from "inquirer";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Loads a schema from a file.
 * @param schemaPath Path to the schema file.
 * @returns The loaded schema.
 * @throws If the schema file is malformed or cannot be loaded.
 */
export async function loadSchema(
  schemaPath: string
): Promise<SchemaDefinition> {
  const loadTsModule = async (
    tsFilePath: string
  ): Promise<SchemaDefinition> => {
    const tempFile = join(__dirname, "../../temp-schema.mjs");
    try {
      const tsCode = readFileSync(tsFilePath, "utf-8");
      const { code } = transformSync(tsCode, {
        format: "esm",
        loader: "ts",
        target: "esnext",
      });
      writeFileSync(tempFile, code);
      return (await import(`${tempFile}?t=${Date.now()}`)).default;
    } finally {
      unlinkSync(tempFile);
    }
  };

  try {
    if (schemaPath.endsWith(".ts")) {
      return await loadTsModule(schemaPath);
    } else if (schemaPath.endsWith(".js")) {
      return (await import(`${schemaPath}?t=${Date.now()}`)).default;
    } else if (schemaPath.endsWith(".json")) {
      return JSON.parse(readFileSync(schemaPath, "utf-8"));
    }
    throw new Error(`Unsupported schema format. Use .ts, .js or .json`);
  } catch (error) {
    throw new Error(
      `Failed to load schema from ${schemaPath}: ${(error as Error).message}`
    );
  }
}

/**
 * Applies fixes to the given environment file by prompting the user to input
 * values for missing variables and variables that do not match the schema.
 *
 * @param issues An object where each key is the name of an environment variable
 * and the value is an object containing the `value` property (which is the
 * invalid value) and the `key` property (which is the name of the variable).
 * @param schema The schema definition for the environment variables.
 * @param envPath The path to the environment file. Defaults to `.env`.
 * @throws If the schema is malformed or if the user cancels the prompt.
 */
export async function applyFix(
  issues: Record<string, any>,
  schema: SchemaDefinition,
  envPath: string = ".env"
): Promise<void> {
  const envLines = readFileSync(envPath, "utf-8").split("\n");

  for (const key in issues) {
    if (!Object.prototype.hasOwnProperty.call(issues, key)) continue;
    const issue = issues[key];
    const rule = schema[key];

    if (!rule) {
      console.error(
        Chalk.red(`Error: Could not find rule for key ${key} in schema`)
      );
      continue;
    }

    const { value } = await inquirer.prompt({
      type: "input",
      name: "value",
      message: `${Chalk.yellow(key)} (${rule.docs || "No description"})`,
      default: rule.default !== undefined ? String(rule.default) : "",
      validate: (input) => {
        if (rule.required && !input) {
          return "Value is required";
        }
        return true;
      },
    });

    const lineIndex = envLines.findIndex((line) => line.startsWith(`${key}=`));

    if (lineIndex >= 0) {
      envLines[lineIndex] = `${key}=${value}`;
    } else {
      envLines.push(`${key}=${value}`);
    }
  }

  writeFileSync(envPath, envLines.join("\n"));
  console.log(Chalk.green(`Updated ${envPath} successfully!`));
}
