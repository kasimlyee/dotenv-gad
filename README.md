# dotenv-gad

[![npm version](https://badge.fury.io/js/dotenv-gad.svg)](https://badge.fury.io/js/dotenv-gad)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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
- CI/CD friendly (comming soon!)

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

## 📜 License

MIT © [Kasim Lyee]

[![contribution](https://github.com/kasimlyee/dotenv-gad/blob/main/CONTRIBUTING.md)] are welcome!!
