import { readFileSync, writeFileSync } from "fs";
import { SchemaDefinition } from "../../schema.js";
import Chalk from "chalk";
import inquirer from "inquirer";

// Re-export from the standalone schema loader (no CLI-only deps)
export { loadSchema } from "../../schema-loader.js";

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

    // Sanitize: strip newlines and carriage returns to prevent .env injection
    const sanitized = String(value).replace(/[\r\n]/g, "");

    const lineIndex = envLines.findIndex((line) => line.startsWith(`${key}=`));

    if (lineIndex >= 0) {
      envLines[lineIndex] = `${key}=${sanitized}`;
    } else {
      envLines.push(`${key}=${sanitized}`);
    }
  }

  writeFileSync(envPath, envLines.join("\n"));
  console.log(Chalk.green(`Updated ${envPath} successfully!`));
}
