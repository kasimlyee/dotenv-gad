import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {validateEnv} from "../../index"
import { AggregateError } from "../../errors";
import { loadSchema } from "./utils";

export default function (program: Command) {
  return new Command("check")
    .description("Validate .env against schema")
    .option("--strict", "Fail on extra env vars not in schema")
    .option("--fix", "Attempt to fix errors interactively")
    .action(async (option, command) => {
      const rootOpts = command.parent.opts();
      const spinner = ora("Validating environment...").start();

      try {
        const schema = await loadSchema(rootOpts.schema);
        const env = validateEnv(schema, {
          strict: option.strict,
        });

        spinner.succeed(chalk.green("Environment validation passed!"));
        console.log(
          chalk.dim(`Found ${Object.keys(env).length} valid variables`)
        );
      } catch (error) {
        spinner.stop();
        if (error instanceof AggregateError) {
          console.error(chalk.red("\nEnvironment validation failed:"));
          error.errors.forEach((e) => {
            console.log(`  ${chalk.yellow(e.key)}: ${e.message}`);
            if (e.rule?.docs) {
              console.log(chalk.dim(`  ${e.rule.docs}`));
            }
          });

          process.exit(1);
        } else {
          console.error(chalk.red("Unexpected error:"), error);
          process.exit(2);
        }
      }
    });
}
