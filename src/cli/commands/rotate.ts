import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { createInterface } from "node:readline/promises";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import dotenv from "dotenv";
import {
  generateKeyPair,
  encryptEnvValue,
  decryptEnvValue,
  isEncryptedValue,
  loadPrivateKey,
} from "../../crypto.js";
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
  return new Command("rotate")
    .description("Rotate encryption keys: decrypt all fields, generate a new key pair, re-encrypt")
    .option("--keys <file>", "Path to the .env.keys file", ".env.keys")
    .option("-f, --force", "Skip confirmation prompt")
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
          spinner.info(chalk.dim("No fields with encrypted: true in schema. Nothing to rotate."));
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

        spinner.text = "Loading current private key…";
        const oldPrivateKeyHex = loadPrivateKey({ keysPath });
        if (!oldPrivateKeyHex) {
          spinner.fail(
            chalk.red(
              "Current private key not found.\n" +
                `  Checked: ${keysPath} and ENVGAD_PRIVATE_KEY env var\n` +
                "  Cannot rotate without the current private key."
            )
          );
          process.exit(1);
        }

        // Identify which fields have encrypted values in the .env file
        const toRotate = encryptedFields.filter(
          (k) => parsed[k] && isEncryptedValue(parsed[k])
        );

        spinner.stop();

        if (toRotate.length === 0) {
          console.log(chalk.dim("No encrypted values found in .env to rotate."));
          return;
        }

        console.log(
          chalk.bold(`\nKey rotation will affect ${toRotate.length} field(s):\n`) +
            toRotate.map((k) => chalk.dim(`  • ${k}`)).join("\n") +
            "\n\n" +
            chalk.yellow("This operation will:\n") +
            chalk.dim("  1. Decrypt all encrypted values with the current private key\n") +
            chalk.dim("  2. Generate a new X25519 key pair\n") +
            chalk.dim("  3. Re-encrypt all values with the new public key\n") +
            chalk.dim("  4. Write the new public key to " + envPath + "\n") +
            chalk.dim("  5. Save the old private key as ENVGAD_PRIVATE_KEY_OLD in " + keysPath + "\n") +
            chalk.dim("  6. Write the new private key to " + keysPath + "\n")
        );

        if (!opts.force) {
          const ok = await confirm("   Proceed with key rotation? (y/N): ");
          if (!ok) {
            console.log(chalk.dim("\nAborted."));
            return;
          }
          console.log();
        }

        const spinner2 = ora("Step 1/4: Decrypting current values…").start();

        // Step 1: Decrypt all encrypted values with the old key
        const decrypted: Record<string, string> = {};
        const decryptErrors: string[] = [];

        for (const key of toRotate) {
          try {
            decrypted[key] = decryptEnvValue(parsed[key], oldPrivateKeyHex, key);
          } catch (err) {
            decryptErrors.push(
              `${key}: ${err instanceof Error ? err.message : "decryption failed"}`
            );
          }
        }

        if (decryptErrors.length > 0) {
          spinner2.fail(chalk.red("Decryption failed for some fields. Aborting rotation."));
          for (const e of decryptErrors) {
            console.error(chalk.red(`  ✗ ${e}`));
          }
          console.log(chalk.dim("\nNo changes were written. Your .env and .env.keys are unchanged."));
          process.exit(1);
        }

        spinner2.text = "Step 2/4: Generating new key pair…";

        // Step 2: Generate new key pair
        const { publicKeyHex: newPublicKeyHex, privateKeyHex: newPrivateKeyHex } =
          generateKeyPair();

        spinner2.text = "Step 3/4: Re-encrypting values with new key…";

        // Step 3: Re-encrypt all values with the new public key
        const reEncrypted: Record<string, string> = {};
        for (const key of toRotate) {
          reEncrypted[key] = encryptEnvValue(decrypted[key], newPublicKeyHex, key);
        }

        spinner2.text = "Step 4/4: Writing updated files…";

        // Step 4: Update .env — replace all encrypted values and the public key
        let updatedEnvContent = envContent;

        // Update ENVGAD_PUBLIC_KEY
        if (/^ENVGAD_PUBLIC_KEY=/m.test(updatedEnvContent)) {
          updatedEnvContent = updatedEnvContent.replace(
            /^ENVGAD_PUBLIC_KEY=.*$/m,
            `ENVGAD_PUBLIC_KEY=${newPublicKeyHex}`
          );
        } else {
          const sep = updatedEnvContent.endsWith("\n") ? "" : "\n";
          updatedEnvContent += `${sep}ENVGAD_PUBLIC_KEY=${newPublicKeyHex}\n`;
        }

        // Replace each re-encrypted value
        for (const [key, value] of Object.entries(reEncrypted)) {
          updatedEnvContent = updatedEnvContent.replace(
            new RegExp(`^(${key}\\s*=).*$`, "m"),
            `$1${value}`
          );
        }

        writeFileSync(envPath, updatedEnvContent);

        // Step 5: Update .env.keys — keep old key as ENVGAD_PRIVATE_KEY_OLD
        const keysFileContent =
          "# KEEP THIS FILE SECRET — DO NOT COMMIT TO GIT\n" +
          "# Share securely via 1Password, Vault, or a secure channel\n" +
          `ENVGAD_PRIVATE_KEY=${newPrivateKeyHex}\n` +
          `\n# Previous key (kept for emergency access)\n` +
          `ENVGAD_PRIVATE_KEY_OLD=${oldPrivateKeyHex}\n`;

        // Back up old .env.keys before overwriting
        if (existsSync(keysPath)) {
          copyFileSync(keysPath, `${keysPath}.bak`);
        }

        writeFileSync(keysPath, keysFileContent, { mode: 0o600 });

        spinner2.succeed(chalk.green("Key rotation complete!"));

        console.log(
          `\n${chalk.green("✓")} ${toRotate.length} field(s) re-encrypted in ${chalk.bold(envPath)}\n` +
            `${chalk.green("✓")} New public key written to ${chalk.bold(envPath)}\n` +
            `${chalk.green("✓")} New private key written to ${chalk.bold(keysPath)}\n` +
            `${chalk.dim(`✓ Previous private key preserved as ENVGAD_PRIVATE_KEY_OLD in ${keysPath}`)}\n` +
            (existsSync(`${keysPath}.bak`)
              ? chalk.dim(`✓ Backup of old ${keysPath} saved as ${keysPath}.bak\n`)
              : "") +
            "\n" +
            chalk.yellow("Next steps:\n") +
            chalk.dim("  • Distribute the new .env.keys to team members\n") +
            chalk.dim("  • Update ENVGAD_PRIVATE_KEY in CI/CD secrets\n") +
            chalk.dim("  • Run: ") +
            chalk.cyan("npx dotenv-gad verify") +
            chalk.dim(" to confirm decryption works with the new key")
        );
      } catch (error) {
        spinner.stop();
        console.error(chalk.red("Unexpected error:"), error);
        process.exit(2);
      }
    });
}
