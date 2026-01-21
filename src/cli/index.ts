#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import figlet from "figlet";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import checkCommand from "./commands/check";
import syncCommand from "./commands/sync";
import typesCommand from "./commands/types";
import initCommand from "./commands/init";
import fixCommand from "./commands/fix";
import docsCommand from "./commands/docs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, "../../package.json"), "utf-8")
);

export function createCLI() {
  const program = new Command();

  program
    .version(pkg.version)
    .description(
      chalk.green(
        figlet.textSync("dotenv-gad", {
          font: "Standard",
          horizontalLayout: "fitted",
        })
      )
    )
    .option("--debug", "Enable debug output")
    .option("--env <file>", "Specify env file path", ".env")
    .option("--schema <file>", "Specify schema file path", "env.schema.ts");

  const commands = [
    checkCommand,
    syncCommand,
    typesCommand,
    initCommand,
    fixCommand,
    docsCommand,
  ];

  commands.forEach((command) => {
    const cmd = command(program);
    program.addCommand(cmd);
  });

  return program;
}

const program = createCLI();
program.parse(process.argv);
export default program;
