# dotenv-gad Next.js Example

This example shows how to run `loadEnv` at build time in `next.config.js` to inject validated envs.

Quick start

```bash
cd examples/nextjs
npm ci
npm run dev
```

Environment

Copy `.env.example` to `.env` and set `API_URL`.

Notes

- The example installs the local package via `file:../..`. For a public package, install from npm instead.
- Validating envs during build catches issues before deployment.
