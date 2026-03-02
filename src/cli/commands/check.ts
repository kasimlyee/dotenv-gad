import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {validateEnv} from "../../index.js"
import { EnvAggregateError, EncryptionKeyMissingError } from "../../errors.js";
import { loadSchema } from "./utils.js";

export default function (_program: Command) {
  return new Command("check")
    .description("Validate .env against schema")
    .option("--strict", "Fail on extra env vars not in schema")
    .option("--fix", "Attempt to fix errors interactively")
    .option("--keys <file>", "Path to .env.keys file for decrypting encrypted fields", ".env.keys")
    .option("--allow-plaintext", "Warn instead of error when encrypted fields have plaintext values")
    .action(async (option, command) => {
      const rootOpts = command.parent.opts();
      const spinner = ora("Validating environment...").start();

      try {
        const schema = await loadSchema(rootOpts.schema);
        const env = validateEnv(schema, {
          strict: option.strict,
          path: rootOpts.env,
          keysPath: option.keys,
          allowPlaintext: option.allowPlaintext,
        });

        spinner.succeed(chalk.green("Environment validation passed!"));
        console.log(
          chalk.dim(`Found ${Object.keys(env).length} valid variables`)
        );
      } catch (error) {
        spinner.stop();
        if (error instanceof EnvAggregateError) {
          console.error(chalk.red("\nEnvironment validation failed:"));
          error.errors.forEach((e) => {
            console.log(`  ${chalk.yellow(e.key)}: ${e.message}`);
            if (e.rule?.docs) {
              console.log(chalk.dim(`  ${e.rule.docs}`));
            }
          });

          process.exit(1);
        } else if (error instanceof EncryptionKeyMissingError) {
          console.error(chalk.red(`\n✗ ${error.message}`));
          process.exit(1);
        } else {
          console.error(chalk.red("Unexpected error:"), error);
          process.exit(2);
        }
      }
    });
}
