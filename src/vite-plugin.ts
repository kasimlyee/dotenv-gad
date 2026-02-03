/**
 * Vite-plugin-dotenv-gad
 * 
 * Runs dotenv-gad validation exclusively in Node.js (inside Vite hooks),
 * then exposes the filtered, validated env through a virtual module.
 * 
 * Usage:
 *      import dotenvGad from 'dotenv-gad/vite';
 * 
 *      export default defineConfig({
 *          dotenvGad({
 *              schemaPath: './env.schema.ts', // path to your defineSchema file (default: './env.schema')
 *              publicKeys: ['MY_PUBLIC_KEY] // non-VITE_ keys to whitelist for the browser
 *          })
 *      }) 
 * 
 * Inside app:
 *      import { env } from 'dotenv-gad/client';
 *      console.log(env.VITE_API_URL);
 * 
 */

import { createRequire } from "node:module";
import { resolve } from "node:path";
import { existsSync, writeFileSync, realpathSync } from "node:fs";
import type {Plugin, Vite }