# Error Reporting & Secrets

dotenv-gad reports structured validation errors using `EnvAggregateError`. Example output:

```
Environment validation failed:
  - DATABASE_URL: Missing required environment variable
  - PORT: Must be a number (received: "abc")
  - API_KEY: Must start with 'sk_' (received: "invalid")
```

## Redaction and options

- By default, **sensitive** properties are masked (`****`) in error output.
- Non-sensitive values are truncated when long to avoid leaking secrets.
- Set `includeRaw: true` on `loadEnv` or `EnvValidator` to include raw *non-sensitive* values in the error report.
- Set `includeSensitive: true` (with `includeRaw`) to show sensitive values too — only use for local debugging.

## Programmatic access

`EnvAggregateError.errors` contains structured objects:

```ts
import { EnvAggregateError } from 'dotenv-gad';

try {
  const env = loadEnv(schema);
} catch (err) {
  if (err instanceof EnvAggregateError) {
    for (const e of err.errors) {
      console.log(e.key, e.message);
      // { key: 'PORT', message: 'Must be a number', value: 'abc', rule: {...} }
    }
  }
}
```

> **Migration note**: The old `AggregateError` export is still available as a deprecated alias for `EnvAggregateError`.
