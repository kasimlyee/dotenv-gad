import { defineSchema } from 'dotenv-gad';

export default defineSchema({
  API_URL: { type: 'string', required: true, docs: 'Public API URL' },
});
