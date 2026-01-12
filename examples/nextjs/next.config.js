import { loadEnv } from 'dotenv-gad';
import schema from './env.schema.js';

const env = loadEnv(schema);

export default {
  env: {
    API_URL: env.API_URL,
  },
};
