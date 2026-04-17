import { loadEnv, getRuntimeName, getRuntimeVersion } from "dotenv-gad";
import schema from "./env.schema";

const env = loadEnv(schema);

console.log(`Runtime : ${getRuntimeName()} ${getRuntimeVersion()}`);
console.log(`PORT    : ${env.PORT}`);
console.log(`DB URL  : ${env.DATABASE_URL}`);
console.log(`API KEY : ${env.API_KEY}`);
console.log("");

const server = Bun.serve({
  port: env.PORT,
  fetch() {
    return new Response(
      JSON.stringify({ status: "ok", runtime: getRuntimeName(), port: env.PORT }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
});

console.log(`Server listening on http://localhost:${server.port}`);
console.log("Press Ctrl+C to stop.");
