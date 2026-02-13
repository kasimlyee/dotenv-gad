import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import { loadSchema, applyFix } from "./utils.js";
import { validateEnv } from "../../index.js";
import { EnvAggregateError } from "../../errors.js";

export default function (program: Command) {
  return new Command("fix")
    .description("Interactively fix environment issues")
    .action(async (options, command) => {
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

          const { confirmed } = await inquirer.prompt({
            type: "confirm",
            name: "confirmed",
            message: `\nWould you like to fix these issues interactively?`,
            default: true,
          });

          if (confirmed) {
            // Convert errors array to issues object format expected by applyFix
            const issues: Record<string, any> = {};
            error.errors.forEach((e) => {
              issues[e.key] = { value: e.value, key: e.key };
            });

            await applyFix(issues, schema, rootOpts.env || ".env");
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
