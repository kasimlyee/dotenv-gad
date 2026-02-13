# dotenv-gad Vite Example

This example demonstrates how to use `dotenv-gad` with its Vite plugin for
type-safe, validated environment variables in a browser application.

## Features

- **Build-time validation** — your `.env` is checked against `env.schema.ts`
  every time you run `vite build` or `vite dev`.
- **Client-side filtering** — only variables matching the `clientPrefix`
  (default `VITE_`) are exposed to client code. Sensitive variables like
  `DATABASE_URL` are automatically excluded.
- **TypeScript IntelliSense** — the plugin generates a `.d.ts` file so
  `import { env } from "dotenv-gad/client"` gives you full autocomplete.

## Quick Start

```bash
# Install dependencies
npm install

# Create your .env (already provided in this example)
# Then start the dev server
npm run dev
```

## How It Works

1. **`env.schema.ts`** defines the expected variables with types, defaults,
   and documentation.
2. **`vite.config.ts`** registers the `dotenvGad()` plugin which intercepts
   `import ... from "dotenv-gad/client"` and replaces it with the validated,
   filtered env object.
3. **`src/main.ts`** imports `env` from `"dotenv-gad/client"` and uses the
   validated values with full type safety.
