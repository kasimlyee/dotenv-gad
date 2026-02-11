---
sidebar_position: 4
---

# Vite Plugin

dotenv-gad ships a Vite plugin that validates your environment variables at dev/build time and exposes the safe, typed subset to your browser code via a virtual module.

## Installation

```bash
npm install dotenv-gad
```

No extra packages needed — the plugin is included in the main package.

## Setup

**1. Create a schema** (`env.schema.ts`):

```ts
import { defineSchema } from 'dotenv-gad';

export default defineSchema({
  VITE_APP_TITLE: {
    type: 'string',
    default: 'My App',
    docs: 'Application title displayed in the browser',
  },
  VITE_API_URL: {
    type: 'url',
    required: true,
    docs: 'Backend API base URL',
  },
  VITE_DEBUG: {
    type: 'boolean',
    default: false,
    docs: 'Enable debug logging in the browser console',
  },
  DATABASE_URL: {
    type: 'string',
    sensitive: true,
    docs: 'Database connection string (server-only)',
  },
});
```

**2. Register the plugin** (`vite.config.ts`):

```ts
import { defineConfig } from 'vite';
import dotenvGad from 'dotenv-gad/vite';

export default defineConfig({
  plugins: [
    dotenvGad({
      schemaPath: './env.schema.ts',
    }),
  ],
});
```

**3. Import the validated env** in your app:

```ts
import { env } from 'dotenv-gad/client';

console.log(env.VITE_APP_TITLE);
console.log(env.VITE_API_URL);
```

## How it works

1. During `configureServer` (dev) or `buildStart` (build), the plugin loads your schema and validates **all** env vars using Vite's own `loadEnv` (respects `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local`).
2. The validated env is filtered — only keys matching `clientPrefix` (default `VITE_`) and explicitly listed `publicKeys` are exposed. Keys marked `sensitive` are **always excluded**.
3. When you `import { env } from 'dotenv-gad/client'`, the plugin intercepts the import and returns the filtered object as a virtual module.
4. A `.d.ts` file is auto-generated so you get full IntelliSense on the `env` object.

## Plugin Options

| Option | Type | Default | Description |
|---|---|---|---|
| `schemaPath` | `string` | `'./env.schema.ts'` | Path to the schema file (relative to project root) |
| `clientPrefix` | `string` | `'VITE_'` | Prefix identifying client-safe env vars |
| `publicKeys` | `string[]` | `[]` | Extra keys to expose (even without the prefix) |
| `envFiles` | `string[]` | `[]` | Additional `.env` files to watch for changes |
| `generatedTypes` | `boolean` | `true` | Write a `.d.ts` file for IntelliSense |
| `typesOutput` | `string` | `'./dotenv-gad.d.ts'` | Where to write the generated `.d.ts` |

## SSR Safety

The plugin only intercepts `dotenv-gad/client` imports in **client** bundles. In SSR/server code, the import falls through to the stub module — use `loadEnv` or `EnvValidator` directly for server-side env access.

## HMR

When you edit `.env` files or the schema file, the plugin automatically re-validates and hot-reloads the virtual module. If validation fails, you'll see a clear error in both the terminal and browser console.

## Error Handling

- **Dev server**: Validation errors are logged to the terminal. The virtual module throws at import time so the browser shows the error.
- **Build**: Validation errors abort the build with a clear message.

## Example

A complete working example is available at [`examples/vite-app/`](https://github.com/kasimlyee/dotenv-gad/tree/main/examples/vite-app).
