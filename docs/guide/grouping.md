# Grouping / Namespaced envs

You can group related environment variables into a single object by defining `properties` on an `object`-typed rule. Optionally provide `envPrefix` to control variable naming; by default `envPrefix` is `<KEY>_` (e.g., `DATABASE_`).

Example schema:

```ts
const schema = defineSchema({
  DATABASE: {
    type: 'object',
    envPrefix: 'DATABASE_', // optional
    properties: {
      DB_NAME: { type: 'string', required: true },
      PORT: { type: 'port', default: 5432 },
      PWD: { type: 'string', sensitive: true }
    }
  }
});
```

Given env variables:

```
DATABASE_DB_NAME=mydb
DATABASE_PORT=5432
DATABASE_PWD=supersecret
```

`loadEnv(schema)` returns:

```ts
{ DATABASE: { DB_NAME: 'mydb', PORT: 5432, PWD: 'supersecret' } }
```

Behavior & Notes

- Prefixed variables take precedence over a top-level JSON `DATABASE` env if both are present; in that case a warning is printed.
- In **strict** mode, unexpected grouped subkeys (e.g., `DATABASE_EXTRA`) cause validation to fail.
- `sensitive` and `includeRaw` apply per property inside groups.
- The `sync` CLI emits grouped `.env.example` entries automatically.

This approach keeps structured configuration tidy and works well with 12-factor apps and containerized deployment environments.
