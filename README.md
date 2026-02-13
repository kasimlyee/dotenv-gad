# dotenv-gad

[![npm version](https://badge.fury.io/js/dotenv-gad.svg)](https://badge.fury.io/js/dotenv-gad)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docs](https://img.shields.io/badge/docs-latest-blue?style=flat-square)](https://kasimlyee.github.io/dotenv-gad/latest/)

**dotenv-gad** is an environment variable validation tool that brings type safety and schema validation to your Node.js and JavaScript applications. It extends `dotenv` with features like:

- Type-safe environment variables
- Schema validation
- Schema composition
- Automatic documentation generation
- TypeScript support
- CLI tooling
- Secret management

## Installation

```bash
npm install dotenv-gad
# or
yarn add dotenv-gad
# or
pnpm add dotenv-gad
```

## Quick Start

1. Create a schema file (`env.schema.ts`):

```typescript
import { defineSchema } from "dotenv-gad";

export default defineSchema({
  PORT: {
    type: "number",
    default: 3000,
    docs: "Port to run the server on",
  },
  DATABASE_URL: {
    type: "string",
    required: true,
    sensitive: true,
  },
});
```

2. Validate your environment:

```typescript
import { loadEnv } from "dotenv-gad";
import schema from "./env.schema";

const env = loadEnv(schema);
console.log(`Server running on port ${env.PORT}`);
```

Documentation

[![Docs](https://img.shields.io/badge/docs-latest-blue?style=flat-square)](https://kasimlyee.github.io/dotenv-gad/latest/)

Full documentation is available via GitHub Pages (published from `docs/`).

To preview locally:

```bash
npm ci
npm run docs:serve
```

Docs preview on PRs

When you open or update a pull request that changes docs, an automated preview will be published to GitHub Pages under `previews/pr-<number>/` and a comment with the preview link will be posted on the PR. This makes it easy to review documentation changes without merging.

## CLI Commands

| Command | Description                        |
| ------- | ---------------------------------- |
| `check` | Validate .env against schema       |
| `sync`  | Generate/update .env.example       |
| `types` | Generate env.d.ts TypeScript types |
| `init`  | Create starter schema              |
| `fix`   | Fixes environment issues           |
| `docs`  | Generates .env documentation       |

```bash
npx dotenv-gad check
npx dotenv-gad types
```

## Vite Plugin

The Vite plugin provides build-time environment variable validation with automatic client-safe filtering for browser-based applications.

### Add to your `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import dotenvGad from "dotenv-gad/vite";

export default defineConfig({
  plugins: [
    dotenvGad({
      schemaPath: "./env.schema.ts",
      clientPrefix: "VITE_", // Default prefix for client-safe variables
      publicKeys: [], // Additional non-prefixed keys to expose
      generatedTypes: true, // Generate dotenv-gad.d.ts for IntelliSense
    }),
  ],
});
```

### Use validated environment variables in your app:

```typescript
import { env } from "dotenv-gad/client";

console.log(env.VITE_API_URL); // Full type safety & validation
```

### Key Features

- **Build-time validation**: Environment checked every dev/build cycle
- **Client-safe filtering**: Only `VITE_` prefixed variables (or custom `publicKeys`) exposed to browser
- **Automatic TypeScript types**: Generated `dotenv-gad.d.ts` for full IntelliSense
- **Sensitive protection**: Variables marked `sensitive: true` are excluded by default
- **HMR support**: Hot reload on `.env` changes during development

## Features

### Core Validation

- Type checking (string, number, boolean, array, object)
- Required/optional fields
- Default values
- Custom validation functions
- Environment-specific rules

### Advanced Types

```typescript
{
  API_URL: { type: 'url' },
  EMAIL: { type: 'email' },
  CONFIG: { type: 'json' },
  TAGS: {
    type: 'array',
    items: { type: 'string' }
  }
}
```

### CLI Features

- Color-coded output
- Interactive fixes
- Strict mode
- Custom schema paths
- CI/CD friendly

### Secret Management

```typescript
{
  API_KEY: {
    type: 'string',
    sensitive: true, // Excluded from .env.example
    validate: (val) => val.startsWith('sk_')
  }
}
```

## Framework Integrations

### Express.js

```typescript
import express from "express";
import { loadEnv } from "dotenv-gad";
import schema from "./env.schema";

const env = loadEnv(schema);
const app = express();

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});
```

### Next.js

Create `next.config.js`:

```javascript
const { loadEnv } = require("dotenv-gad");
const schema = require("./env.schema");

const env = loadEnv(schema);

module.exports = {
  env: {
    API_URL: env.API_URL,
  },
};
```

## Validation Reports

Example error output:

```
Environment validation failed:
  - DATABASE_URL: Missing required environment variable
  - PORT: Must be a number (received: "abc")
  - API_KEY: Must start with 'sk_' (received: "invalid")
```

By default values in the report are redacted (sensitive values are always masked). You can opt-in to include raw values in error reports when instantiating the validator (useful for local debugging) by using the `includeRaw` option. If you also want to reveal values marked as `sensitive: true` set `includeSensitive` to `true` (use with caution).

```ts
// include raw values in errors (non-sensitive values only)
import { loadEnv } from "dotenv-gad";
const env = loadEnv(schema, { includeRaw: true });

// or with finer control
import { EnvValidator } from "dotenv-gad";
const validator = new EnvValidator(schema, { includeRaw: true, includeSensitive: true });
try {
  validator.validate(process.env);
} catch (err) {
  console.error(String(err));
}
```

## more usages

### Environment-Specific Rules

```typescript
{
  DEBUG: {
    type: 'boolean',
    env: {
      development: { default: true },
      production: { default: false }
    }
  }
}
```

### Custom Validators

```typescript
{
  PASSWORD: {
    type: 'string',
    validate: (val) => val.length >= 8,
    error: 'Password must be at least 8 characters'
  }
}
```

### Transformations

```typescript
{
  FEATURES: {
    type: 'array',
    transform: (val) => val.split(',')
  }
}
```

### Grouping / Namespaced envs

You can group related environment variables into a single object using `object` with `properties` and an optional `envPrefix` (defaults to `KEY_`):

```ts
const schema = defineSchema({
  DATABASE: {
    type: 'object',
    envPrefix: 'DATABASE_', // optional; defaults to 'DATABASE_'
    properties: {
      DB_NAME: { type: 'string', required: true },
      PORT: { type: 'port', default: 5432 },
      PWD: { type: 'string', sensitive: true }
    }
  }
});
```

Given the following environment:

```
DATABASE_DB_NAME=mydb
DATABASE_PORT=5432
DATABASE_PWD=supersecret
```

`loadEnv(schema)` will return:

```ts
{ DATABASE: { DB_NAME: 'mydb', PORT: 5432, PWD: 'supersecret' } }
```

Notes and behavior:

- The default `envPrefix` is `${KEY}_` (for `DATABASE` it's `DATABASE_`) if you don't specify `envPrefix`.
- Prefixed variables take precedence over a JSON top-level env var (e.g., `DATABASE` = '{...}'). If both are present, prefixed variables win and a warning is printed.
- In strict mode (`{ strict: true }`), unexpected subkeys inside a group (e.g., `DATABASE_EXTRA`) will cause validation to fail.
- `sensitive` and `includeRaw` behavior still applies for grouped properties: sensitive properties are still masked in errors unless `includeSensitive` is explicitly set.

The CLI `sync` command will now generate grouped entries in `.env.example` for object properties so it's easier to scaffold grouped configuration.

## License

MIT © [Kasim Lyee]

[Contributions](https://github.com/kasimlyee/dotenv-gad/blob/main/CONTRIBUTING.md) are welcome!!
