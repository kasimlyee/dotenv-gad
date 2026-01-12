# Benchmarks

A lightweight benchmark is included at `benchmarks/validate-bench.js` to measure validation throughput. The benchmark appends results to `benchmarks/results.txt` so CI can collect them as artifacts.

Run locally:

```bash
npm run build
npm run bench
```

Example output:

```
2026-01-12T00:00:00.000Z | runs=200000 | totalMs=999.909 | msPerRun=0.004999
```

We use a nightly GitHub Action to collect benchmark results and upload them as an artifact. Over time we'll add regression checks to warn or fail the build when performance decreases beyond a threshold.
