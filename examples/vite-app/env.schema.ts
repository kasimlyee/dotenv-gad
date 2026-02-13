import { defineSchema } from "dotenv-gad";

export default defineSchema({
  VITE_APP_TITLE: {
    type: "string",
    default: "My Vite App",
    docs: "Application title displayed in the browser",
  },
  VITE_API_URL: {
    type: "url",
    required: true,
    docs: "Backend API base URL",
  },
  VITE_DEBUG: {
    type: "boolean",
    default: false,
    docs: "Enable debug logging in the browser console",
  },
  DATABASE_URL: {
    type: "string",
    sensitive: true,
    docs: "Database connection string (server-only, never exposed to client)",
  },
});
