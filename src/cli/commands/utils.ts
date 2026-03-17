import { readFileSync, writeFileSync } from "fs";
import { createInterface } from "node:readline/promises";
import { SchemaDefinition } from "../../schema.js";
import Chalk from "chalk";

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
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    for (const key in issues) {
      if (!Object.prototype.hasOwnProperty.call(issues, key)) continue;

      const rule = schema[key];
      if (!rule) {
        console.error(Chalk.red(`Error: Could not find rule for key ${key} in schema`));
        continue;
      }

      const defaultValue = rule.default !== undefined ? String(rule.default) : "";
      const hint = defaultValue ? Chalk.dim(` [${defaultValue}]`) : "";
      const prompt = `${Chalk.yellow(key)} (${rule.docs || "No description"})${hint}: `;

      let input: string;
      while (true) {
        const answer = await rl.question(prompt);
        input = answer.trim() || defaultValue;
        if (rule.required && !input) {
          console.log(Chalk.red("  Value is required"));
          continue;
        }
        break;
      }

      // Sanitize: strip newlines and carriage returns to prevent .env injection
      const sanitized = input.replace(/[\r\n]/g, "");

      // Quote the value if it contains characters with special meaning in .env files
      // (#  starts a comment, leading/trailing spaces are stripped without quotes)
      const needsQuoting = /[#"\\]/.test(sanitized) || sanitized !== sanitized.trim();
      const envValue = needsQuoting
        ? `"${sanitized.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
        : sanitized;

      const lineIndex = envLines.findIndex((line) => line.startsWith(`${key}=`));
      if (lineIndex >= 0) {
        envLines[lineIndex] = `${key}=${envValue}`;
      } else {
        envLines.push(`${key}=${envValue}`);
      }
    }
  } finally {
    rl.close();
  }

  writeFileSync(envPath, envLines.join("\n"));
  console.log(Chalk.green(`Updated ${envPath} successfully!`));
}
