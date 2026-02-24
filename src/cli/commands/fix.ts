import { Command } from "commander";
import chalk from "chalk";
import { createInterface } from "node:readline/promises";
import { loadSchema, applyFix } from "./utils.js";
import { validateEnv } from "../../index.js";
import { EnvAggregateError } from "../../errors.js";

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim().toLowerCase() === "y";
  } finally {
    rl.close();
  }
}

export default function (_program: Command) {
  return new Command("fix")
    .description("Interactively fix environment issues")
    .action(async (_options, command) => {
      const rootOpts = command.parent.opts();
      const schema = await loadSchema(rootOpts.schema);
      const envPath = rootOpts.env || ".env";

      try {
        // Try to validate - if it succeeds, there are no issues
        validateEnv(schema, { path: envPath });
        console.log(chalk.green("✓ No issues found! Environment is valid."));
        return;
      } catch (error) {
        if (error instanceof EnvAggregateError) {
          console.log(chalk.yellow(`\nFound ${error.errors.length} issue(s):\n`));
          error.errors.forEach((e) => {
            console.log(`  ${chalk.red("✗")} ${chalk.yellow(e.key)}: ${e.message}`);
            if (e.rule?.docs) {
              console.log(chalk.dim(`    ${e.rule.docs}`));
            }
          });

          const ok = await confirm(
            chalk.bold("\nWould you like to fix these issues interactively? (y/N): ")
          );

          if (ok) {
            const issues: Record<string, any> = {};
            error.errors.forEach((e) => {
              issues[e.key] = { value: e.value, key: e.key };
            });
            await applyFix(issues, schema, envPath);
          } else {
            console.log(chalk.dim("\nFix cancelled."));
            process.exit(1);
          }
        } else {
          console.error(chalk.red("Unexpected error:"), error);
          process.exit(2);
        }
      }
    });
}
