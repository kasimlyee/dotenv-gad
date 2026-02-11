# Express Example

This example shows how to use `dotenv-gad` in an Express application to validate environment variables and fail fast if required configuration is missing.

Schema (`env.schema.ts`):

```ts
import { defineSchema } from 'dotenv-gad';

export default defineSchema({
  PORT: { type: 'number', default: 3000, docs: 'Port to run the server on' },
  DATABASE_URL: { type: 'string', required: true, sensitive: true },
});
```

Server (`server.ts`):

```ts
import express from 'express';
import schema from './env.schema';
import { loadEnv } from 'dotenv-gad';

const env = loadEnv(schema); // throws on validation errors

const app = express();
app.get('/', (req, res) => res.send('Hello'));

app.listen(env.PORT, () => console.log(`Server running on ${env.PORT}`));
```

Notes
- Use `includeRaw` during local debugging if you want raw values to appear in errors: `loadEnv(schema, { includeRaw: true })`.
- For production, keep `includeRaw` disabled to avoid leaking values in logs.

Try it online

- StackBlitz: https://stackblitz.com/github/kasimlyee/dotenv-gad/tree/main/examples/express
- Run locally:

```bash
cd examples/express
npm ci
npm start
```
