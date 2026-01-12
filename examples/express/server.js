import express from 'express';
import dotenv from 'dotenv';
import schema from './env.schema.js';
import { loadEnv } from 'dotenv-gad';

dotenv.config();

// Validate env using the local package (installed via file:../.. in examples)
const env = loadEnv(schema);

const app = express();
app.get('/', (req, res) => res.send(`Hello — connected to DB: ${env.DATABASE_URL ? 'yes' : 'no'}`));

app.listen(env.PORT, () => console.log(`Server running on ${env.PORT}`));
