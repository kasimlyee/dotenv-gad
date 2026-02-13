/**
 * Example: Using dotenv-gad/client in a Vite app
 *
 * The `env` object is validated at build time by the Vite plugin.
 * Only variables matching the `clientPrefix` ("VITE_") are exposed.
 * Sensitive variables (like DATABASE_URL) are automatically filtered out.
 */
import { env } from "dotenv-gad/client";

document.getElementById("app")!.innerHTML = `
  <h1>${env.VITE_APP_TITLE ?? "App"}</h1>
  <p>API URL: <code>${env.VITE_API_URL ?? "not set"}</code></p>
  <p>Debug mode: <code>${env.VITE_DEBUG ?? false}</code></p>
`;

if (env.VITE_DEBUG) {
  console.log("[debug] Environment loaded:", env);
}
