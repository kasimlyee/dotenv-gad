import { defineConfig } from "vite";
import dotenvGad from "dotenv-gad/vite";

export default defineConfig({
  plugins: [
    dotenvGad({
      // Path to your schema file (default: ./env.schema.ts)
      schemaPath: "./env.schema.ts",
      // clientPrefix defaults to "VITE_" — variables matching
      // this prefix are automatically exposed to the browser.
      // Sensitive keys are always excluded regardless of prefix.
    }),
  ],
});
