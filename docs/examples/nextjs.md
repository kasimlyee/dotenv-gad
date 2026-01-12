# Next.js Example

When using `dotenv-gad` with Next.js, you can validate environment variables at build time and inject typed values into `next.config.js` or use them in server-side code.

`next.config.js`:

```js
const { loadEnv } = require('dotenv-gad');
const schema = require('./env.schema');

const env = loadEnv(schema);

module.exports = {
  env: {
    API_URL: env.API_URL,
  }
};
```

Notes
- Validating env at build time helps catch missing or invalid configuration before deployment.
- If you prefer to keep secret values server-only, validate them in server-side code rather than injecting into client bundles.
