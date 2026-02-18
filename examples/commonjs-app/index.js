const { defineSchema, loadEnv, EnvValidator } = require("dotenv-gad");

// Define schema — same API as ESM
const schema = defineSchema({
  PORT: { type: "port", default: 3000 },
  NODE_ENV: {
    type: "string",
    required: true,
    enum: ["development", "production", "test"],
  },
  DATABASE_URL: { type: "url", required: true },
  API_KEY: { type: "string", required: true, sensitive: true },
});

// Load and validate
const env = loadEnv(schema);

console.log("CommonJS require() works!");
console.log("PORT:", env.PORT);
console.log("NODE_ENV:", env.NODE_ENV);
console.log("DATABASE_URL:", env.DATABASE_URL);
console.log("API_KEY:", env.API_KEY);

// Also test EnvValidator directly
const validator = new EnvValidator(schema);
const result = validator.validate({
  PORT: "8080",
  NODE_ENV: "production",
  DATABASE_URL: "https://db.example.com",
  API_KEY: "sk-prod-key",
});

console.log("\nDirect validation:");
console.log("PORT:", result.PORT, "(type:", typeof result.PORT + ")");
console.log("NODE_ENV:", result.NODE_ENV);
