import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    client: "src/client.ts",
  },
  format: ["cjs"],
  outDir: "dist",
  dts: false,
  splitting: false,
  clean: false,
});
