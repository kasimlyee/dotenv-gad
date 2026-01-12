import { defineSchema } from 'dotenv-gad';

export default defineSchema({
  PORT: { type: 'number', default: 3000, docs: 'Port to run the server on' },
  DATABASE_URL: { type: 'string', required: true, sensitive: true, docs: 'Connection string to your DB' },
});
