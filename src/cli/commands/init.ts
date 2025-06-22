import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { writeFileSync, existsSync } from "fs";
import inquirer from "inquirer";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function (program: Command) {
  return new Command("init")
    .description("Initialize new schema file")
    .option("--force", "Overwrite existing files")
    .action(async (options, command) => {
      const rootOpts = command.parent.opts();
      const schemaPath = rootOpts.schema;

      if (existsSync(schemaPath)) {
        if (!options.force) {
          const { overwrite } = await inquirer.prompt({
            type: "confirm",
            name: "overwrite",
            message: "Schema file already exists. Overwrite?",
            default: false,
          });
          if (!overwrite) process.exit(0);
        }
      }

      const spinner = ora("Creating new schema...").start();

      try {
        const template = `import { defineSchema } from 'dotenv-gad';

export default defineSchema({
  // Add your environment variables here
  PORT: {
    type: 'number',
    default: 3000,
    docs: 'Port to run the server on'
  },
  NODE_ENV: {
    type: 'string',
    enum: ['development', 'production', 'test'],
    default: 'development'
  },
  DB_URL: {
    type: 'string',
    required: true,
    docs: 'Database connection URL'
  }
});
`;

        writeFileSync(schemaPath, template);
        spinner.succeed(chalk.green(`Created ${schemaPath} successfully!`));
        console.log(
          chalk.dim("\nEdit this file to define your environment schema")
        );
      } catch (error) {
        spinner.fail(chalk.red("Failed to create schema file"));
        console.error(error);
        process.exit(1);
      }
    });
}
