# CreateEnvProxy & Lazy Parsing

`createEnvProxy` returns a proxy that throws if you access unvalidated properties. This is useful to ensure parts of your app only use validated values.

Example:

```ts
import { loadEnv, createEnvProxy } from 'dotenv-gad';
import schema from './env.schema';

const env = loadEnv(schema);
const safeEnv = createEnvProxy(env);

// Later in the code:
function connect() {
  const url = safeEnv.DATABASE_URL; // throws if DATABASE_URL not validated
}
```

Lazy parsing: If you want values to be parsed only when accessed, consider using a transform that returns a getter or using `createEnvProxy` to centralize access.
