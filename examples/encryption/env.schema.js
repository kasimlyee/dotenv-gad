import { defineSchema } from 'dotenv-gad';

export default defineSchema({
  PORT: {
    type: 'number',
    default: 3000,
    docs: 'Port the server listens on',
  },
  NODE_ENV: {
    type: 'string',
    default: 'development',
    docs: 'Runtime environment',
  },
  DATABASE_URL: {
    type: 'string',
    required: true,
    sensitive: true,
    encrypted: true,
    docs: 'PostgreSQL connection string — encrypted at rest in .env',
  },
  API_SECRET: {
    type: 'string',
    required: true,
    sensitive: true,
    encrypted: true,
    docs: 'Third-party API secret key — encrypted at rest in .env',
  },
});
