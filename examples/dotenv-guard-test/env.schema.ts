import { defineSchema } from "dotenv-guard";

export default defineSchema({
  VITE_APP_TITLE: {
    type: "string",
    required: true,
    docs: "Application title displayed in the browser tab",
  },
  VITE_API_URL: {
    type: "url",
    required: true,
    docs: "Base URL for API requests",
  },
  VITE_DEBUG_MODE: {
    type: "boolean",
    default: false,
    docs: "Enable debug features in the application",
  },
  VITE_MAX_ITEMS: {
    type: "number",
    min: 1,
    max: 100,
    default: 20,
    docs: "Maximum items to display per page",
  },
});
