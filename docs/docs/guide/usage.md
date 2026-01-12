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

Load environment:

```ts
import { loadEnv } from 'dotenv-gad';
import schema from './env.schema';

const env = loadEnv(schema);
console.log(env.PORT);
```

Options

- `strict` — when true, fail on environment variables not present in the schema.
- `includeRaw` — include raw values in error reports (non-sensitive by default).
- `includeSensitive` — when used with `includeRaw` will reveal values marked sensitive (use only for local debugging).

CLI

- `npx dotenv-gad check` — check .env against the schema
- `npx dotenv-gad sync` — generate/update `.env.example`
- `npx dotenv-gad types` — generate `env.d.ts`
