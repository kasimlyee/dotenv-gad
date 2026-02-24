import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { createInterface } from "node:readline/promises";
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { generateKeyPair } from "../../crypto.js";

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim().toLowerCase() === "y";
  } finally {
    rl.close();
  }
}

export default function (program: Command) {
  return new Command("keygen")
    .description("Generate an X25519 key pair for schema-based encryption")
    .option("--keys <file>", "Path to write the private key file", ".env.keys")
    .option("-f, --force", "Overwrite existing keys without confirmation")
    .action(async (opts, command) => {
      const rootOpts = command.parent.opts();
      const envPath: string = rootOpts.env ?? ".env";
      const keysPath: string = opts.keys;

      // Warn and confirm if keys already exist (unless --force)
      const envContent = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
      const hasExistingPublicKey = /^ENVGAD_PUBLIC_KEY=/m.test(envContent);
      const hasExistingKeysFile = existsSync(keysPath);

      if ((hasExistingPublicKey || hasExistingKeysFile) && !opts.force) {
        console.log(
          chalk.yellow("\n⚠  Existing keys detected:") +
            (hasExistingPublicKey
              ? chalk.dim(`\n   ENVGAD_PUBLIC_KEY found in ${envPath}`)
              : "") +
            (hasExistingKeysFile
              ? chalk.dim(`\n   ${keysPath} already exists`)
              : "") +
            chalk.yellow(
              "\n\n   Generating new keys invalidates all existing encrypted values.\n" +
                "   Use 'npx dotenv-gad rotate' for safe key rotation.\n"
            )
        );

        const ok = await confirm("   Generate new keys anyway? (y/N): ");
        if (!ok) {
          console.log(chalk.dim("\nAborted."));
          return;
        }
        console.log();
      }

      const spinner = ora("Generating X25519 key pair…").start();
      const { publicKeyHex, privateKeyHex } = generateKeyPair();

      // Update or append public key in .env
      let newEnvContent: string;
      if (hasExistingPublicKey) {
        newEnvContent = envContent.replace(
          /^ENVGAD_PUBLIC_KEY=.*$/m,
          `ENVGAD_PUBLIC_KEY=${publicKeyHex}`
        );
      } else {
        const sep = envContent.length > 0 && !envContent.endsWith("\n") ? "\n" : "";
        newEnvContent =
          envContent +
          `${sep}\n# dotenv-gad encryption public key (safe to commit)\n` +
          `ENVGAD_PUBLIC_KEY=${publicKeyHex}\n`;
      }
      writeFileSync(envPath, newEnvContent);

      // Write private key to .env.keys (restricted permissions on Unix)
      writeFileSync(
        keysPath,
        "# KEEP THIS FILE SECRET — DO NOT COMMIT TO GIT\n" +
          "# Share securely via 1Password, Vault, or a secure channel\n" +
          `ENVGAD_PRIVATE_KEY=${privateKeyHex}\n`,
        { mode: 0o600 }
      );

      // Ensure .env.keys is listed in .gitignore
      const gitignorePath = ".gitignore";
      const gitignoreContent = existsSync(gitignorePath)
        ? readFileSync(gitignorePath, "utf8")
        : "";
      if (!gitignoreContent.includes(keysPath)) {
        const sep =
          gitignoreContent.length > 0 && !gitignoreContent.endsWith("\n") ? "\n" : "";
        appendFileSync(
          gitignorePath,
          `${sep}\n# dotenv-gad encryption keys\n${keysPath}\n`
        );
      }

      spinner.succeed(chalk.green("Key pair generated!"));

      console.log(
        "\n" +
          chalk.bold("Public key") +
          chalk.dim(` → ${envPath}`) +
          `\n  ${chalk.cyan(`ENVGAD_PUBLIC_KEY=${publicKeyHex}`)}\n` +
          "\n" +
          chalk.bold("Private key") +
          chalk.dim(` → ${keysPath}`) +
          `\n  ${chalk.cyan(`ENVGAD_PRIVATE_KEY=${privateKeyHex}`)}\n` +
          "\n" +
          chalk.yellow("⚠  Remember:\n") +
          chalk.dim(`  • ${keysPath} is gitignored — never commit it\n`) +
          chalk.dim("  • Share it securely with team members\n") +
          chalk.dim("  • For CI/CD, set ENVGAD_PRIVATE_KEY as an environment secret\n") +
          "\n" +
          chalk.bold("Next steps:\n") +
          chalk.dim("  1. Add ") +
          chalk.cyan("encrypted: true") +
          chalk.dim(" to sensitive fields in your schema\n") +
          chalk.dim("  2. Run: ") +
          chalk.cyan("npx dotenv-gad encrypt")
      );
    });
}