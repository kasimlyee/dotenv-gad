import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { writeFileSync } from "fs";
import { loadSchema } from "./utils.js";
import { SchemaRule } from "../../schema.js";

export default function (program: Command) {
  return new Command("types")
    .description("Generate Typescript types")
    .option("--output <file>", "Output file path", "env.d.ts")
    .action(async (options, command) => {
      const rootOpts = command.parent.opts();
      const spinner = ora("Generating type definitions.......").start();

      try {
        const schema = await loadSchema(rootOpts.schema);
        let typeContent =
          "// Auto-generated by dotenv-gad\n\ndeclare namespace NodeJS{\n  interface ProcessEnv{\n";

        Object.entries(schema).forEach(([key, rule]) => {
          let type: string;

          switch ((rule as SchemaRule).type) {
            case "number":
              type = "number";
              break;
            case "boolean":
              type = "boolean";
              break;
            default:
              type = "string";
          }

          typeContent += `    ${key}${
            (rule as SchemaRule).required ? "" : "?"
          }:${type};\n`;
        });

        typeContent += "  }\n}\n";

        writeFileSync(options.output, typeContent);
        spinner.succeed(
          chalk.green(`Generated ${options.output} successfully!`)
        );
      } catch (error) {
        spinner.fail(chalk.red("Failed to generate type definitions"));
        console.error(error);
        process.exit(1);
      }
    });
}
