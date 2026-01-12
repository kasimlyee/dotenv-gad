import { EnvValidator, defineSchema } from "../dist/index.js";
import fs from "fs";
import path from "path";

const schema = defineSchema({
  PORT: { type: "port", required: true },
  NUM: { type: "number" },
  FLAGS: { type: "array", items: { type: "number" } },
  OBJ: {
    type: "object",
    properties: {
      a: { type: "string" },
      b: { type: "number" },
    },
  },
});

const v = new EnvValidator(schema);

const input = {
  PORT: "3000",
  NUM: "42",
  FLAGS: "[1,2,3]",
  OBJ: '{"a":"hello","b":123}',
};

const runs = 200000;
const start = process.hrtime.bigint();
for (let i = 0; i < runs; i++) {
  v.validate(input);
}
const end = process.hrtime.bigint();
const durationMs = Number(end - start) / 1e6;
const msPerRun = durationMs / runs;
const output = `${new Date().toISOString()} | runs=${runs} | totalMs=${durationMs.toFixed(3)} | msPerRun=${msPerRun.toFixed(6)}\n`;
console.log(output);

// Write to benchmarks/results.txt for CI collection
const outDir = path.resolve(process.cwd(), "benchmarks");
try {
  fs.mkdirSync(outDir, { recursive: true });
  fs.appendFileSync(path.join(outDir, "results.txt"), output);
  console.log("Wrote benchmark results to benchmarks/results.txt");
} catch (err) {
  console.error("Failed to write benchmark results:", err);
}

