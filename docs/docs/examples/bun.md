# Bun Example

This example shows how to use `dotenv-gad` with Bun's native HTTP server to validate environment variables and fail fast if required configuration is missing.

Schema (`env.schema.ts`):

```ts
import { defineSchema } from 'dotenv-gad';

export default defineSchema({
  PORT: { type: 'port', default: 3000, docs: 'Port to run the server on' },
  DATABASE_URL: { type: 'string', required: true, sensitive: true },
  API_KEY: { type: 'string', required: true, sensitive: true },
});
```

Server (`server.ts`):

```ts
import { loadEnv } from 'dotenv-gad';
import schema from './env.schema';

const env = loadEnv(schema); // throws on validation errors

const server = Bun.serve({
  port: env.PORT,
  fetch(request) {
    return new Response(`Hello from Bun! Running on port ${env.PORT}`);
  },
});

console.log(`Server running on http://localhost:${server.port}`);
```

Notes
- `loadEnv` reads from both `Bun.env` (or `process.env`) and your `.env` file. On platforms like Vercel, Railway, or Docker where env vars are injected directly, it just works — no `.env` file needed.
- Bun's built-in `.env` loading is automatically handled by `loadEnv` - just make sure your `.env` file is in the project root.
- Use `includeRaw` during local debugging if you want raw values to appear in errors: `loadEnv(schema, { includeRaw: true })`.
- For production, keep `includeRaw` disabled to avoid leaking values in logs.

Running with Bun

```bash
# Install dependencies
bun install

# Run the server
bun run server.ts
```

CLI Commands

```bash
# Validate your .env file
bunx dotenv-gad check

# Generate .env.example
bunx dotenv-gad sync

# Generate TypeScript types
bunx dotenv-gad types
```

Testing

Bun has a built-in test runner that works great with dotenv-gad:

```ts
import { test, expect } from 'bun:test';
import { loadEnv } from 'dotenv-gad';
import schema from './env.schema';

test('environment is valid', () => {
  expect(() => loadEnv(schema)).not.toThrow();
});
```

Run tests with:

```bash
bun test
```
