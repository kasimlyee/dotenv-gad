import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { createInterface } from "node:readline/promises";
import { readFileSync, writeFileSync } from "node:fs";
import dotenv from "dotenv";
import { decryptEnvValue, isEncryptedValue, loadPrivateKey } from "../../crypto.js";
import { EncryptionKeyMissingError } from "../../errors.js";
import { loadSchema } from "./utils.js";

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim().toLowerCase() === "y";
  } finally {
    rl.close();
  }
}

export default function (_program: Command) {
  return new Command("decrypt")
    .description("Decrypt encrypted values and print them to stdout (or write back with --write)")
    .option("--keys <file>", "Path to the .env.keys private key file", ".env.keys")
    .option(
      "--write",
      "Write decrypted values back to the .env file (requires confirmation)"
    )
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
          spinner.info(chalk.dim("No fields with encrypted: true found in schema."));
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

        spinner.text = "Loading private key…";
        const privateKeyHex = loadPrivateKey({ keysPath });
        if (!privateKeyHex) {
          spinner.fail(
            chalk.red(
              "Private key not found.\n" +
                `  Checked: ${keysPath} and ENVGAD_PRIVATE_KEY env var\n` +
                "  Obtain .env.keys from your team or set ENVGAD_PRIVATE_KEY"
            )
          );
          process.exit(1);
        }

        spinner.text = `Decrypting ${encryptedFields.length} field(s)…`;

        const decrypted: Record<string, string> = {};
        const errors: { key: string; message: string }[] = [];

        for (const key of encryptedFields) {
          const value = parsed[key];

          if (value == null || value === "") continue;

          if (!isEncryptedValue(value)) {
            console.warn(
              chalk.yellow(`  ⚠  ${key}: value is not encrypted (skipping)`)
            );
            continue;
          }

          try {
            decrypted[key] = decryptEnvValue(value, privateKeyHex, key);
          } catch (err) {
            errors.push({
              key,
              message: err instanceof Error ? err.message : "Decryption failed",
            });
          }
        }

        spinner.stop();

        if (errors.length > 0) {
          for (const { key, message } of errors) {
            console.error(`  ${chalk.red("✗")} ${chalk.bold(key)}: ${message}`);
          }
        }

        const decryptedKeys = Object.keys(decrypted);

        if (decryptedKeys.length === 0) {
          console.log(chalk.dim("No encrypted values found to decrypt."));
          return;
        }

        if (!opts.write) {
          // Default: safe stdout output
          console.log(chalk.bold("\n# Decrypted values (stdout only — not written to file):"));
          for (const [key, value] of Object.entries(decrypted)) {
            console.log(`${key}=${value}`);
          }
          console.log(
            chalk.dim(
              `\n${decryptedKeys.length} value(s) printed. ` +
                "Use --write to update the .env file."
            )
          );
          return;
        }

        // --write mode: confirm before overwriting
        console.log(
          chalk.yellow(
            `\n⚠  About to write ${decryptedKeys.length} decrypted value(s) to ${envPath}.`
          ) +
            chalk.dim(
              "\n   This replaces encrypted values with plaintext.\n" +
                "   DO NOT commit these changes to git!\n"
            )
        );

        const ok = await confirm("   Continue? (y/N): ");
        if (!ok) {
          console.log(chalk.dim("\nAborted."));
          return;
        }

        const replaceRegexes = Object.fromEntries(
          Object.keys(decrypted).map((k) => [k, new RegExp(`^(${k}\\s*=).*$`, "m")])
        );

        let updatedContent = envContent;
        for (const [key, value] of Object.entries(decrypted)) {
          updatedContent = updatedContent.replace(replaceRegexes[key], `$1${value}`);
        }

        writeFileSync(envPath, updatedContent);
        console.log(
          `\n${chalk.green("✓")} ${decryptedKeys.length} value(s) written to ${chalk.bold(envPath)}\n` +
            chalk.yellow("⚠  Remember: DO NOT commit these decrypted values!")
        );
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