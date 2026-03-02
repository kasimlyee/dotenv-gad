import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync, readFileSync } from "node:fs";
import dotenv from "dotenv";
import { decryptEnvValue, isEncryptedValue, loadPrivateKey } from "../../crypto.js";
import { EncryptionKeyMissingError } from "../../errors.js";
import { loadSchema } from "./utils.js";

export default function (_program: Command) {
  return new Command("verify")
    .description(
      "Verify all encrypted fields can be decrypted with the current private key (no output)"
    )
    .option("--keys <file>", "Path to .env.keys file", ".env.keys")
    .action(async (opts, command) => {
      const rootOpts = command.parent.opts();
      const envPath: string = rootOpts.env ?? ".env";
      const schemaPath: string = rootOpts.schema ?? "env.schema.ts";
      const keysPath: string = opts.keys;

      const spinner = ora("Loading schema…").start();

      try {
        const schema = await loadSchema(schemaPath);

        const encryptedFields = Object.keys(schema).filter(
          (k) => schema[k].encrypted === true
        );

        if (encryptedFields.length === 0) {
          spinner.info(chalk.dim("No fields with encrypted: true in schema. Nothing to verify."));
          return;
        }

        spinner.text = `Reading ${envPath}…`;

        let envContent = "";
        try {
          envContent = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
        } catch {
          spinner.fail(chalk.red(`Cannot read ${envPath}`));
          process.exit(1);
        }

        const parsed = dotenv.parse(envContent);

        spinner.text = "Loading private key…";
        const privateKeyHex = loadPrivateKey({ keysPath });
        if (!privateKeyHex) {
          spinner.fail(
            chalk.red(
              "Private key not found.\n" +
                `  Checked: ${keysPath} and ENVGAD_PRIVATE_KEY env var`
            )
          );
          process.exit(1);
        }

        spinner.text = `Verifying ${encryptedFields.length} encrypted field(s)…`;

        const results: { key: string; ok: boolean; reason?: string }[] = [];

        for (const key of encryptedFields) {
          const value = parsed[key];

          if (value == null || value === "") {
            // No value present — skip (required check is handled by validate)
            continue;
          }

          if (!isEncryptedValue(value)) {
            results.push({ key, ok: false, reason: "value is plaintext (not encrypted)" });
            continue;
          }

          try {
            decryptEnvValue(value, privateKeyHex, key);
            results.push({ key, ok: true });
          } catch (err) {
            results.push({
              key,
              ok: false,
              reason: err instanceof Error ? err.message : "Decryption failed",
            });
          }
        }

        spinner.stop();

        const failed = results.filter((r) => !r.ok);
        const passed = results.filter((r) => r.ok);

        for (const { key, ok, reason } of results) {
          if (ok) {
            console.log(`  ${chalk.green("✓")} ${chalk.bold(key)}`);
          } else {
            console.log(
              `  ${chalk.red("✗")} ${chalk.bold(key)}: ${chalk.red(reason ?? "failed")}`
            );
          }
        }

        console.log();

        if (failed.length > 0) {
          console.log(
            chalk.red(`✗ ${failed.length} field(s) failed verification`) +
              chalk.dim(`, ${passed.length} passed`)
          );
          process.exit(1);
        } else if (passed.length === 0) {
          console.log(chalk.dim("No encrypted values found in .env to verify."));
        } else {
          console.log(
            chalk.green(`✓ All ${passed.length} encrypted field(s) verified successfully`)
          );
        }
      } catch (error) {
        spinner.stop();
        if (error instanceof EncryptionKeyMissingError) {
          console.error(chalk.red(`\n✗ ${error.message}`));
          process.exit(1);
        }
        console.error(chalk.red("Unexpected error:"), error);
        process.exit(2);
      }
    });
}
