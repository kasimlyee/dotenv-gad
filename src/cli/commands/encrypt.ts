import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { readFileSync, writeFileSync } from "node:fs";
import dotenv from "dotenv";
import { encryptEnvValue, isEncryptedValue } from "../../crypto.js";
import { EncryptionKeyMissingError } from "../../errors.js";
import { loadSchema } from "./utils.js";

export default function (_program: Command) {
  return new Command("encrypt")
    .description("Encrypt plaintext values for fields marked encrypted: true in the schema")
    .action(async (_opts, command) => {
      const rootOpts = command.parent.opts();
      const envPath: string = rootOpts.env ?? ".env";
      const schemaPath: string = rootOpts.schema ?? "env.schema.ts";

      const spinner = ora("Loading schema…").start();

      try {
        const schema = await loadSchema(schemaPath);

        const encryptedFields = Object.keys(schema).filter(
          (k) => schema[k].encrypted === true
        );

        if (encryptedFields.length === 0) {
          spinner.info(
            chalk.dim("No fields with encrypted: true found in schema. Nothing to do.")
          );
          return;
        }

        spinner.text = `Reading ${envPath}…`;

        let envContent: string;
        try {
          envContent = readFileSync(envPath, "utf8");
        } catch {
          spinner.fail(chalk.red(`Cannot read ${envPath}`));
          process.exit(1);
        }

        const parsed = dotenv.parse(envContent);
        const publicKeyHex = parsed.ENVGAD_PUBLIC_KEY;

        if (!publicKeyHex) {
          spinner.fail(
            chalk.red(
              `ENVGAD_PUBLIC_KEY not found in ${envPath}.\n` +
                "  Run: " +
                chalk.cyan("npx dotenv-gad keygen")
            )
          );
          process.exit(1);
        }

        spinner.text = `Encrypting ${encryptedFields.length} field(s)…`;

        const keyRegex = (k: string) => new RegExp(`^(${k}\\s*=).*$`, "m");
        const replaceRegexes = Object.fromEntries(encryptedFields.map((k) => [k, keyRegex(k)]));

        let updatedContent = envContent;
        let encryptedCount = 0;
        const results: { key: string; status: "encrypted" | "skipped" | "missing" }[] = [];

        for (const key of encryptedFields) {
          const value = parsed[key];

          if (value == null || value === "") {
            results.push({ key, status: "missing" });
            continue;
          }

          if (isEncryptedValue(value)) {
            results.push({ key, status: "skipped" });
            continue;
          }

          const encrypted = encryptEnvValue(value, publicKeyHex, key);
          updatedContent = updatedContent.replace(replaceRegexes[key], `$1${encrypted}`);
          results.push({ key, status: "encrypted" });
          encryptedCount++;
        }

        spinner.stop();

        for (const { key, status } of results) {
          if (status === "encrypted") {
            console.log(`  ${chalk.green("✓")} ${chalk.bold(key)}: encrypted`);
          } else if (status === "skipped") {
            console.log(`  ${chalk.dim("⊘")} ${chalk.dim(key + ": already encrypted (skipped)")}`);
          } else {
            console.log(`  ${chalk.dim("⊘")} ${chalk.dim(key + ": not present in .env (skipped)")}`);
          }
        }

        if (encryptedCount > 0) {
          writeFileSync(envPath, updatedContent);
          console.log(
            `\n${chalk.green("✓")} ${encryptedCount} field(s) encrypted in ${chalk.bold(envPath)}`
          );
        } else {
          console.log(chalk.dim("\nNo fields needed encryption."));
        }
      } catch (error) {
        spinner.stop();
        if (error instanceof EncryptionKeyMissingError) {
          console.error(chalk.red(`\n✗ ${error.message}`));
          process.exit(1);
        }
        console.error(chalk.red("\nUnexpected error:"), error);
        process.exit(2);
      }
    });
}