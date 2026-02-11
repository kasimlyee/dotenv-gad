import { defineConfig } from "vite";
import dotenvGad from "dotenv-gad/vite";

export default defineConfig({
  plugins: [
    dotenvGad({
      // Path to your schema file (default: env.schema.ts)
      schemaPath: "./env.schema.ts",
      // Only expose VITE_* variables to client code
      clientPrefix: "VITE_",
    }),
  ],
});
