import { loadEnv } from 'dotenv-gad';
import schema from './env.schema.js';

// loadEnv reads .env, decrypts any encrypted:v1:... values using .env.keys,
// then validates every field against the schema before returning.
const env = loadEnv(schema);

console.log('Environment loaded and decrypted successfully!\n');
console.log(`  PORT         : ${env.PORT}`);
console.log(`  NODE_ENV     : ${env.NODE_ENV}`);
console.log(`  DATABASE_URL : ${env.DATABASE_URL ? '[decrypted ✓]' : 'missing'}`);
console.log(`  API_SECRET   : ${env.API_SECRET ? '[decrypted ✓]' : 'missing'}`);

// Sensitive values are available as plain strings at runtime — only the
// .env file on disk stays encrypted. Never log the actual values in prod.
if (env.NODE_ENV !== 'production') {
  console.log('\n  (dev) DATABASE_URL starts with:', env.DATABASE_URL.split('@')[0]);
}
