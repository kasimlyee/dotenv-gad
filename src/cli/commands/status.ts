import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync, readFileSync } from "node:fs";
import dotenv from "dotenv";
import { isEncryptedValue, loadPrivateKey } from "../../crypto.js";
import { loadSchema } from "./utils.js";

export default function (_program: Command) {
  return new Command("status")
    .description("Show encryption status of all schema fields in the .env file")
    .option("--keys <file>", "Path to .env.keys file", ".env.keys")
    .action(async (opts, command) => {
      const rootOpts = command.parent.opts();
      const envPath: string = rootOpts.env ?? ".env";
      const schemaPath: string = rootOpts.schema ?? "env.schema.ts";
      const keysPath: string = opts.keys;

      const spinner = ora("Loading schema…").start();

      try {
        const schema = await loadSchema(schemaPath);

        let envContent = "";
        if (existsSync(envPath)) {
          envContent = readFileSync(envPath, "utf8");
        }
        const parsed = dotenv.parse(envContent);

        // Check key availability
        const hasPublicKey = Boolean(parsed.ENVGAD_PUBLIC_KEY);
        const privateKeyHex = loadPrivateKey({ keysPath });

        spinner.stop();

        const schemaKeys = Object.keys(schema);
        const encryptedSchemaKeys = new Set(
          schemaKeys.filter((k) => schema[k].encrypted)
        );

        console.log(chalk.bold("\nEnvironment Encryption Status"));
        console.log(chalk.dim("─".repeat(52)));

        let correctCount = 0;
        let warningCount = 0;

        for (const key of schemaKeys) {
          const rule = schema[key];
          const value = parsed[key];
          const needsEncryption = rule.encrypted === true;
          const valueIsEncrypted = value ? isEncryptedValue(value) : false;
          const valueMissing = value == null || value === "";

          let icon: string;
          let label: string;
          let note: string;

          if (valueMissing) {
            if (needsEncryption) {
              icon = chalk.dim("○");
              label = chalk.dim("missing");
              note = chalk.dim("(encrypted when present)");
            } else {
              icon = chalk.dim("○");
              label = chalk.dim("missing");
              note = "";
            }
          } else if (needsEncryption && valueIsEncrypted) {
            icon = chalk.green("✓");
            label = chalk.green("encrypted");
            note = chalk.dim("(correct)");
            correctCount++;
          } else if (needsEncryption && !valueIsEncrypted) {
            icon = chalk.yellow("⚠");
            label = chalk.yellow("plaintext");
            note = chalk.yellow("(should be encrypted — run: npx dotenv-gad encrypt)");
            warningCount++;
          } else if (!needsEncryption && valueIsEncrypted) {
            icon = chalk.red("✗");
            label = chalk.red("encrypted");
            note = chalk.red("(schema lacks encrypted: true)");
            warningCount++;
          } else {
            icon = chalk.green("✓");
            label = chalk.dim("plaintext");
            note = chalk.dim("(no encryption required)");
            correctCount++;
          }

          const keyDisplay = chalk.bold(key.padEnd(24));
          console.log(`  ${icon} ${keyDisplay} ${label}  ${note}`);
        }

        console.log(chalk.dim("─".repeat(52)));

        // Key availability summary
        console.log();
        if (hasPublicKey) {
          console.log(
            `  ${chalk.green("✓")} ${chalk.dim("Public key (ENVGAD_PUBLIC_KEY): present in " + envPath)}`
          );
        } else {
          console.log(
            `  ${chalk.yellow("⚠")} ${chalk.yellow("Public key (ENVGAD_PUBLIC_KEY): missing — run: npx dotenv-gad keygen")}`
          );
        }

        if (privateKeyHex) {
          const src = existsSync(keysPath) ? keysPath : "ENVGAD_PRIVATE_KEY env var";
          console.log(
            `  ${chalk.green("✓")} ${chalk.dim("Private key (ENVGAD_PRIVATE_KEY): found in " + src)}`
          );
        } else {
          console.log(
            `  ${chalk.dim("○")} ${chalk.dim("Private key (ENVGAD_PRIVATE_KEY): not found (needed for decryption only)")}`
          );
        }

        console.log();

        const encryptedTotal = encryptedSchemaKeys.size;
        if (warningCount > 0) {
          console.log(
            chalk.yellow(`  ${warningCount} issue(s) detected`) +
              chalk.dim(`, ${correctCount} correct, ${encryptedTotal} field(s) require encryption`)
          );
          process.exit(1);
        } else {
          console.log(
            chalk.green(`  All ${schemaKeys.length} field(s) are correctly configured`)
          );
        }
      } catch (error) {
        spinner.stop();
        console.error(chalk.red("Unexpected error:"), error);
        process.exit(2);
      }
    });
}
