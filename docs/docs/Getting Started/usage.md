# Quick Start

Install:

```bash
npm install dotenv-gad
```

Define a schema (`env.schema.ts`):

```ts
import { defineSchema } from 'dotenv-gad';

export default defineSchema({
  PORT: { type: 'number', default: 3000, docs: 'Port to run the server on' },
  DATABASE_URL: { type: 'string', required: true, sensitive: true },
});
```

Load and validate your environment:

```ts
import { loadEnv } from 'dotenv-gad';
import schema from './env.schema';

const env = loadEnv(schema);
console.log(env.PORT); // number — fully typed
```

`loadEnv` reads from both `process.env` and your `.env` file (if present). `.env` file values take priority over existing `process.env` values, but platform-injected variables (Vercel, Railway, Docker, AWS Lambda) work out of the box — no `.env` file required.

## Options

- `strict` — when true, fail on environment variables not present in the schema.
- `includeRaw` — include raw values in error reports (non-sensitive by default).
- `includeSensitive` — when used with `includeRaw` will reveal values marked sensitive (use only for local debugging).
- `path` — path to a custom `.env` file (defaults to `.env` in cwd).

## Using EnvValidator directly

For more control (e.g., validating a custom env record without loading from a file):

```ts
import { EnvValidator } from 'dotenv-gad';
import schema from './env.schema';

const validator = new EnvValidator(schema);
const env = validator.validate(process.env);
```

## CLI

- `npx dotenv-gad check` — check .env against the schema
- `npx dotenv-gad sync` — generate/update `.env.example`
- `npx dotenv-gad types` — generate `env.d.ts`
