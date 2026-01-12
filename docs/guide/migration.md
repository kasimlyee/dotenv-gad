# Migration / Upgrading

This release added:

- Grouping via `envPrefix` for `object` types
- `includeRaw` / `includeSensitive` options for error reporting
- Benchmarks and CI collection

If you relied on reading a top-level JSON `DATABASE` value, note that prefixed vars take precedence when both are present; consider removing or updating the top-level JSON env to avoid ambiguity.
