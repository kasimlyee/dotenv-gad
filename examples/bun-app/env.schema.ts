import { defineSchema } from "dotenv-gad";

export default defineSchema({
  PORT:         { type: "port",   default: 3000,  docs: "Port to run the server on" },
  DATABASE_URL: { type: "string", required: true,  sensitive: true, encrypted: true, docs: "Connection URL for the database" },
  API_KEY:      { type: "string", required: true,  sensitive: true, encrypted: true, docs: "API key for authentication" },
});
