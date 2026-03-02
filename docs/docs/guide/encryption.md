---
sidebar_position: 4
---

# Encryption

dotenv-gad supports **at-rest encryption** for sensitive environment variables. Secrets like database passwords and API keys are stored as encrypted ciphertext in your `.env` file using asymmetric X25519 + ChaCha20-Poly1305 encryption, and are decrypted transparently at runtime. Your `.env` file becomes safe to commit to version control.

## How it works

```
.env (committed)              .env.keys (gitignored)
──────────────────            ──────────────────────
DATABASE_URL=encrypted:v1:…   ENVGAD_PRIVATE_KEY=302e…
API_SECRET=encrypted:v1:…
ENVGAD_PUBLIC_KEY=302a…
```

- **Public key** (`ENVGAD_PUBLIC_KEY`) lives in `.env` — safe to commit
- **Private key** (`ENVGAD_PRIVATE_KEY`) lives in `.env.keys` — **never commit this**
- Each value is encrypted with a fresh ephemeral key (non-deterministic)
- The variable name is bound to the ciphertext (AAD), so ciphertexts cannot be swapped between fields

## Setup

### 1. Mark fields as encrypted in your schema

```typescript
import { defineSchema } from 'dotenv-gad';

export default defineSchema({
  PORT: { type: 'number', default: 3000 },
  DATABASE_URL: {
    type: 'string',
    required: true,
    sensitive: true,
    encrypted: true,
  },
  API_SECRET: {
    type: 'string',
    required: true,
    sensitive: true,
    encrypted: true,
  },
});
```

### 2. Generate a key pair (once per project)

```bash
npx dotenv-gad keygen
```

This:
- Generates an X25519 key pair
- Writes `ENVGAD_PUBLIC_KEY` to your `.env`
- Creates `.env.keys` with `ENVGAD_PRIVATE_KEY` (mode `0600`)
- Adds `.env.keys` to `.gitignore` automatically

### 3. Add plaintext values to `.env`, then encrypt

Fill in your secrets as plaintext:

```
DATABASE_URL=postgres://user:pass@localhost/mydb
API_SECRET=sk-1234abcd
```

Then run:

```bash
npx dotenv-gad encrypt
```

Your `.env` now contains encrypted tokens:

```
DATABASE_URL=encrypted:v1:Ro4rhopWVr0w280K2ISH…
API_SECRET=encrypted:v1:k9+sK8/UmM55zMdJkQjr…
ENVGAD_PUBLIC_KEY=302a300506032b656e032100…
```

### 4. Use `loadEnv` as normal

```typescript
import { loadEnv } from 'dotenv-gad';
import schema from './env.schema';

// Decrypts encrypted fields automatically using .env.keys
const env = loadEnv(schema);

console.log(env.DATABASE_URL); // "postgres://user:pass@localhost/mydb"
```

Decryption happens transparently at startup. No code changes needed beyond the schema.

## CLI commands

| Command | Description |
|---|---|
| `keygen` | Generate a new X25519 key pair |
| `encrypt` | Encrypt all plaintext `encrypted: true` fields in `.env` |
| `decrypt` | Print decrypted values to stdout (or write back with `--write`) |
| `rotate` | Rotate keys: decrypt → new key pair → re-encrypt |
| `status` | Show encryption status of each schema field |
| `verify` | Dry-run: confirm all encrypted values decrypt without revealing them |

```bash
npx dotenv-gad status
npx dotenv-gad verify
npx dotenv-gad rotate
```

## CI/CD

Do not put `.env.keys` in your repository. Instead, set the private key as a secret in your CI/CD platform:

```bash
# GitHub Actions
ENVGAD_PRIVATE_KEY=302e020100300506032b6...

# Or pass it as a --keys flag pointing to a file
npx dotenv-gad verify --keys /run/secrets/env.keys
```

`loadEnv` and `EnvValidator` check `ENVGAD_PRIVATE_KEY` in `process.env` when no `.env.keys` file is found.

## Key rotation

To rotate keys safely without losing any data:

```bash
npx dotenv-gad rotate
```

This command:
1. Decrypts all encrypted values with the **current** private key
2. Generates a **new** X25519 key pair
3. Re-encrypts all values with the new public key
4. Backs up both `.env` → `.env.bak` and `.env.keys` → `.env.keys.bak`
5. Writes the new keys (old private key preserved as `ENVGAD_PRIVATE_KEY_OLD` for emergency access)

After rotation, distribute the new `.env.keys` to your team and update the CI/CD secret.

## Options

### `allowPlaintext` — gradual migration

If you're adding encryption to an existing project, use `allowPlaintext: true` to allow plaintext values while you migrate:

```typescript
const env = loadEnv(schema, { allowPlaintext: true });
```

This emits a warning instead of an error when an `encrypted: true` field has a plaintext value.

### Custom `keysPath`

```typescript
const env = loadEnv(schema, { keysPath: '/run/secrets/env.keys' });
```

The default is `.env.keys` in the current working directory.

## Security notes

- **Algorithm**: X25519 ECDH + HKDF-SHA256 + ChaCha20-Poly1305 (ECIES)
- **Non-deterministic**: each `encrypt` call produces a different ciphertext for the same value
- **AAD binding**: ciphertexts are bound to their variable name — copying a ciphertext to a different variable will fail decryption
- **Auth tag**: ChaCha20-Poly1305 authenticates every byte; any tampering causes decryption to fail
- **Key format**: public key is 44-byte SPKI DER (88 hex chars), private key is 48-byte PKCS8 DER (96 hex chars) — both validated on load

## Schema field reference

| Field | Type | Description |
|---|---|---|
| `encrypted` | `boolean` | When `true`, the value must be stored as an `encrypted:v1:…` token |
| `sensitive` | `boolean` | Masks the value in error output (independent of `encrypted`) |

`encrypted` and `sensitive` are independent flags. A field can be `sensitive: true` without being encrypted (it will be masked in logs but stored as plaintext).
