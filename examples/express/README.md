# dotenv-gad Express Example

This example shows how to use `dotenv-gad` inside an Express server.

Quick start

```bash
cd examples/express
npm ci
# This installs the local package via file:../.. so make sure you ran `npm pack` at repo root or have the repo available locally
npm start
```

Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` (required) — your DB connection string (sensitive)
- `PORT` (optional) — port to run the server

Notes
- This example installs the local package via a file dependency in `package.json` (`file:../..`). If you prefer, publish the package and install from npm instead, or run `npm pack` in the repo root and `npm install ../<the-tarball>` in this folder.
