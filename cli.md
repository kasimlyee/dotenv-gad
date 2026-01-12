# CLI Usage

The CLI exposes convenient commands for working with your schema and environment files.

Commands

- `npx dotenv-gad check --strict` — Validate `.env` against the schema. Use `--strict` to fail on extra variables.
- `npx dotenv-gad sync` — Generate or update `.env.example` from your schema (sensitive values are excluded).
- `npx dotenv-gad types` — Generate `env.d.ts` TypeScript types for your schema.
- `npx dotenv-gad init` — Create a starter schema.
- `npx dotenv-gad fix` — Attempt interactive fixes for common issues.

Examples

Validate a repo with CI-friendly output (use exit codes):

```bash
npx dotenv-gad check --strict
```

Add a CI step in GitHub Actions to prevent merging invalid env changes:

```yaml
- name: Validate .env
  run: npx dotenv-gad check --strict
```

Scaffold `.env.example` grouped sections (uses `envPrefix` when present):

```bash
npx dotenv-gad sync --output .env.example
```
