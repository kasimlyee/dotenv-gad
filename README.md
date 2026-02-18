# dotenv-gad

[![npm version](https://badge.fury.io/js/dotenv-gad.svg)](https://badge.fury.io/js/dotenv-gad)
[![CI](https://github.com/kasimlyee/dotenv-gad/actions/workflows/ci.yml/badge.svg)](https://github.com/kasimlyee/dotenv-gad/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-first--class-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docs](https://img.shields.io/badge/docs-latest-blue?style=flat-square)](https://kasimlyee.github.io/dotenv-gad/)
[![npm downloads](https://img.shields.io/npm/dm/dotenv-gad.svg)](https://www.npmjs.com/package/dotenv-gad)

**dotenv-gad** is an environment variable validation library that brings type safety, schema validation, and runtime checks to your Node.js and JavaScript applications. It works with any environment variable source — `.env` files, platform dashboards (Vercel, Railway, Docker), CI/CD pipelines, or `process.env` directly.

- Type-safe environment variables with full IntelliSense
- Schema validation (string, number, boolean, url, email, ip, port, json, array, object)
- Schema composition for modular configs
- Automatic documentation and `.env.example` generation
- First-class TypeScript support
- CLI tooling (check, sync, types, init, fix, docs)
- Sensitive value management and redaction
- Vite plugin with client-safe filtering and HMR

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

`loadEnv` reads from both `process.env` and your `.env` file (if present). This means it works out of the box on platforms like Vercel, Railway, Docker, and AWS Lambda where variables are injected into `process.env` directly — no `.env` file required.

## Documentation

[![Docs](https://img.shields.io/badge/docs-latest-blue?style=flat-square)](https://kasimlyee.github.io/dotenv-gad/)

Full documentation is available at [kasimlyee.github.io/dotenv-gad](https://kasimlyee.github.io/dotenv-gad/).

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

The Vite plugin validates environment variables at build time and exposes a typed, client-safe subset to your browser code via a virtual module.

### Setup

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import dotenvGad from "dotenv-gad/vite";

export default defineConfig({
  plugins: [
    dotenvGad({
      schemaPath: "./env.schema.ts",
      // clientPrefix: "VITE_",   // default — keys matching this prefix are exposed
      // publicKeys: [],          // additional non-prefixed keys to expose
      // generatedTypes: true,    // generate .d.ts for IntelliSense
    }),
  ],
});
```

### Usage

```typescript
import { env } from "dotenv-gad/client";

console.log(env.VITE_API_URL); // Full type safety & autocomplete
```

### Key Features

- **Build-time validation** — environment checked every dev/build cycle
- **Client-safe filtering** — only `VITE_*` prefixed variables (or custom `publicKeys`) exposed to browser
- **Sensitive protection** — variables marked `sensitive: true` are always excluded
- **Auto-generated types** — `dotenv-gad.d.ts` gives full IntelliSense on `env.`
- **HMR support** — hot reload on `.env` or schema changes during development
- **SSR safety** — server-side code gets the full env, not the filtered subset

## Features

### Core Validation

- Type checking (string, number, boolean, array, object, url, email, ip, port, json, date)
- Required/optional fields with defaults
- Custom validation functions
- Value transforms
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

### Schema Composition

Merge multiple schemas for modular configuration:

```typescript
import { defineSchema, composeSchema } from "dotenv-gad";

const baseSchema = defineSchema({
  NODE_ENV: { type: "string", default: "development" },
});

const dbSchema = defineSchema({
  DATABASE_URL: { type: "string", required: true, sensitive: true },
});

const schema = composeSchema(baseSchema, dbSchema);
```

### Secret Management

```typescript
{
  API_KEY: {
    type: 'string',
    sensitive: true,       // masked in errors, excluded from .env.example
    validate: (val) => val.startsWith('sk_')
  }
}
```

### Grouping / Namespaced Envs

Group related variables into a single validated object:

```typescript
const schema = defineSchema({
  DATABASE: {
    type: "object",
    envPrefix: "DATABASE_", // optional; defaults to 'DATABASE_'
    properties: {
      DB_NAME: { type: "string", required: true },
      PORT: { type: "port", default: 5432 },
      PWD: { type: "string", sensitive: true },
    },
  },
});
```

Given `DATABASE_DB_NAME=mydb`, `DATABASE_PORT=5432`, `DATABASE_PWD=supersecret`:

```typescript
const env = loadEnv(schema);
// { DATABASE: { DB_NAME: 'mydb', PORT: 5432, PWD: 'supersecret' } }
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

## Error Reporting

```
Environment validation failed:
  - DATABASE_URL: Missing required environment variable
  - PORT: Must be a number (received: "abc")
  - API_KEY: Must start with 'sk_' (received: "invalid")
```

Sensitive values are always masked in error output. Use `includeRaw` for local debugging:

```typescript
const env = loadEnv(schema, { includeRaw: true });

// or with finer control
import { EnvValidator } from "dotenv-gad";
const validator = new EnvValidator(schema, {
  includeRaw: true,
  includeSensitive: true,
});
```

## More Examples

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

### Transforms

```typescript
{
  FEATURES: {
    type: 'array',
    transform: (val) => val.split(',')
  }
}
```

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

## License

MIT © [Kasim Lyee]

[Contributions](https://github.com/kasimlyee/dotenv-gad/blob/main/CONTRIBUTING.md) are welcome!
