import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";

import { loadSchema, applyFix } from "./utils.js";
import { validateEnv } from "../../index.js";

export default function (program: Command) {
  return new Command("fix")
    .description("Interactivey fix environment issues")
    .action(async (options, command) => {
      const rootOpts = command.parent.opts();
      const schema = await loadSchema(rootOpts.schema);
      const issues = validateEnv(schema);

      if (issues.length === 0) {
        console.log(chalk.green("No issues found!"));
        return;
      }

      const { confirmed } = await inquirer.prompt({
        type: "confirm",
        name: "confirmed",
        message: `Fix ${issues.length} issues?`,
      });

      if (confirmed) {
        await applyFix(issues, schema);
        console.log(chalk.green("Issues fixed!"));
      }
    });
}
