/**
 * Vite-dotenv-gad
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
import { resolve } from "node:path";
import { existsSync, writeFileSync, realpathSync } from "node:fs";
import type {Plugin, ViteDevServer, HmrContext, ResolvedConfig } from "vite"

const MODULE_ID = 'virtual:dotenv-gad';
const RESOLVED_MODULE_ID = '\0' + MODULE_ID;
const CLIENT_ALIAS = 'dotenv-gad/client';

export interface DotenvGadOptions{

     /**
   * Path (relative to project root) to the file that exports a
   * `defineSchema(...)` default export.
   *
   * Supports .ts, .js, .mjs, .cjs, and .json. 
   *
   * @default './env.schema'
   */
    schemaPath?: string;

    /**
   * Extra environment-variable keys (without the VITE_ prefix) that
   * should be forwarded to the browser bundle.  Everything else is
   * stripped at build time.
   *
   * @default []
   */
    publicKeys?: string[];

    /**
   * Absolute or relative glob(s) for additional .env files the plugin
   * should watch.  The plugin already watches `.env` and `.env.<mode>`
   * in the project root automatically.
   *
   * @default []
   */
    envFiles?: string[];

    /**
   * When `true` the plugin will write a `dotenv-gad.d.ts` file in the
   * project root after every successful validation, giving you full
   * IntelliSense on `import { env } from 'dotenv-gad/client'`.
   *
   * @default true
   */
    generatedTypes?: boolean;

    /**
   * Path (relative to project root) where the generated `.d.ts` file
   * will be written.
   *
   * @default './dotenv-gad.d.ts'
   */
    typesOutput?: string;
}



function resolveSchmaPath(root: string, schemaPath: string): string {
    const abs = resolve(root, schemaPath);

    if(existsSync(abs)) return abs;

    const suffixes = ['.ts', '.js', '.mjs', '.cjs','.json'];
    for(const suffix of suffixes){
        const candidate = abs  + suffix;
        if(existsSync(candidate)) return candidate;
    }

    throw new Error(`[dotenv-gad/vite]  Could not find schema file starting from "${abs}".\n
        Make sure your schema file exists and the path is correct.`)
}

const TYPE_MAP: Record<string, string> = {
    string: 'string',
    boolean: 'boolean',
    number: 'number',
    port: 'number',
    date: 'Date',
    json: 'string',
    email: 'string',
    url: 'string',
    ip: 'string',
}

/**
 * Converts a schema definition into a TypeScript type body.
 * We recusively walk throught a schema and produce a that interface
 *
 * @param schema - Record of environment variable names to their schema definitions.
 * @param indent - Optional indent string to prefix each line of the generated type body.
 * @returns A string representing the TypeScript type body.
 */

function schemaToTsBody(schema: Record<string, unknown>, indent: string = '    '): string {
    const lines: string[] =[];

    for(const [key, definition] of Object.entries(schema)){
        if(!definition || typeof definition !== 'object') continue

        const def = definition as Record<string, unknown>;

        const optional = !(def.required === true) && !('default' in def) ? '?' : '';

        if(def.enum && Array.isArray(def.enum)){
            const enumValues = def.enum.map(v => JSON.stringify(v)).join(' | ');
            lines.push(`${indent}${key}${optional}: ${enumValues};`);
        }

        if(def.type === 'object' && def.properties && typeof def.properties === 'object'){
            const nested = schemaToTsBody(def.properties as Record<string, unknown>, indent + '    ');
            lines.push(`${indent}${key}${optional}: {`);
            lines.push(nested);
            lines.push(`${indent}};`);
            continue
        }

        if(def.type === 'array' && def.items && typeof def.items === 'object'){
            const items = def.items as Record<string, unknown>;
            const itemType = TYPE_MAP[items.type as string] ?? 'unknown';
            lines.push(`${indent}${key}${optional}: ${itemType}[];`);
            continue
        }

        if(def.type === 'object'){
            lines.push(`${indent}${key}${optional}: Record<string, unknown>;`);
            continue
        }

        const tsType = TYPE_MAP[def.type as string] ?? 'unknown';
        lines.push(`${indent}${key}${optional}: ${tsType};`);
    
    }

    return lines.join('\n')
}

/**
 * Generates a DTS declaration file for dotenv-gad.
 * @param filteredKeys an array of environment variable names to include in the DTS file.
 * @param fullSchema the full schema definition from which to generate the DTS file.
 * @returns a string containing the DTS declaration file contents.
 */
function generateDtsContent(filteredKeys: string[], fullSchema: Record<string, unknown>): string {
    const filteredSchema: Record<string, unknown> = {};

    for(const key of filteredKeys){
        if(fullSchema[key]) filteredSchema[key] = fullSchema[key];
    }

    const body = schemaToTsBody(filteredSchema);

    return [
    '// ──────────────────────────────────────────────────────────────',
    '// This file is auto-generated by dotenv-gad.',
    '// Do NOT edit manually — it will be overwritten on next build/dev.',
    '// ──────────────────────────────────────────────────────────────',
    '',
    'export interface DotenvGadEnv {',
    body,
    '}',
    '',
    'declare module "virtual:dotenv-gad" {',
    '  export const env: DotenvGadEnv;',
    '  export default env;',
    '}',
    '',
    'declare module "dotenv-gad/client" {',
    '  export const env: DotenvGadEnv;',
    '  export default env;',
    '}',
    '',
  ].join('\n');
}

/**
 * Filters the given validated environment variables for the browser.
 * Only variables that start with `VITE_` or are listed in `publicKeys` are included.
 * This is used to prevent sensitive environment variables from being exposed to the browser.
 * @param validatedEnv - The validated environment variables.
 * @param publicKeys - An array of environment variable names to whitelist for the browser.
 * @returns A new object containing only the whitelisted environment variables.
 */
function filterForBrowser(validatedEnv: Record<string, unknown>, publicKeys: string[]): Record<string, unknown>{
    const allowed = new Set(publicKeys);
    const out: Record<string, unknown> = {};

    for(const [key, value] of Object.entries(validatedEnv)){
        if(key.startsWith('VITE_') || allowed.has(key)){
            out[key] = value;
        }
    }

    return out
}

interface ValidationResult{
    fullEnv: Record<string, unknown>;
    schema: Record<string, unknown>;
}

async function runValidation(schemaPath: string): Promise<ValidationResult>{
    const {loadEnv, loadSchema} = await import('dotenv-gad');

    const schema = await loadSchema(schemaPath)
    const fullEnv = loadEnv(schema)

    return {
        fullEnv: fullEnv,
        schema: schema
    }
}

function collectWatchedFiles(root: string, schemaPath: string, mode: string, extraEnvFiles: string[]): string[]{
    const files: string[] = [schemaPath]

    const dotenv = resolve(root, '.env');
    if(existsSync(dotenv)) files.push(dotenv);

    const dotenvMode = resolve(root, `.env.${mode}`);
    if(existsSync(dotenvMode)) files.push(dotenvMode);

    const dotenvLocal = resolve(root, '.env.local');
    if(existsSync(dotenvLocal)) files.push(dotenvLocal);

    for(const extra of extraEnvFiles){
        const abs = resolve(root, extra);
        if(existsSync(abs)) files.push(abs);
    }

    return files
}

    /**
     * Vite plugin for dotenv-gad.
     * 
     * Validate your environment variables against a schema definition.
     * 
     * Options:
     * - `schemaPath`: The path to your schema definition file.
     * - `publicKeys`: An array of environment variable names to whitelist for the browser.
     * - `envFiles`: An array of environment variable file names to include in the validation.
     * - `generatedTypes`: A boolean indicating whether or not to generate a DTS declaration file for the validated environment variables.
     * - `typesOutput`: The path to which to write the generated DTS declaration file.
     * 
     * @param options - An object containing the above options.
     * @returns A vite plugin object.
     */
export default function dotenvGadPlugin(options: DotenvGadOptions = {}): Plugin{

    const {
        schemaPath = './env.schema.ts',
        publicKeys = [],
        envFiles = [],
        generatedTypes = true,
        typesOutput = './dotenv-gad.d.ts'
    } = options;

    let resolvedConfig!: ResolvedConfig;
    let schemaAbsPath!: string;
    let watchedFiles: string[]= [];

    let currentFilteredEnv: Record<string, unknown> = {}
    let currentSchema: Record<string, unknown> = {}

/**
 * Validates the environment variables against the schema definition
 * and updates the current filtered environment variables and schema.
 * If `generatedTypes` is true, generates a DTS declaration file
 * for the validated environment variables.
 * @param logger - An object containing `info` and `warn` methods
 * to log information and warnings, respectively.
 */
    async function validateAndUpdate(logger: {info: (...a: any[]) =>void; warn:(...a: any[]) =>void}){
        const result = await runValidation(schemaAbsPath);

        currentFilteredEnv = filterForBrowser(result.fullEnv, publicKeys);
        currentSchema = result.schema;

        if(generatedTypes){
            const dtsPath = resolve(resolvedConfig.root, typesOutput);
            const content = generateDtsContent(Object.keys(currentFilteredEnv), currentSchema);
            writeFileSync(dtsPath, content, 'utf-8');
            logger.info(`[dotenv-gad]   ✓ Generated types → ${dtsPath}`);
        }

    }

    return {
        name: 'vite-dotenv-gad',

        config(config, {mode}){
            const root = config.root ?? process.cwd();
            schemaAbsPath = resolveSchmaPath(root, schemaPath);
            watchedFiles = collectWatchedFiles(root, schemaAbsPath, mode, envFiles);

            return undefined;
        },

        configResolved(config){
            resolvedConfig = config;
        },

        async configureServer(server: ViteDevServer){
            try{
                await validateAndUpdate(server.config.logger);
                 server.config.logger.info('[dotenv-gad]     ✓ Environment validated successfully.');
            }catch(err: unknown){
                server.config.logger.error(`\n[dotenv-gad]     ✗ Environment validation failed: \n${String(err)}\n`);

            }

            server.watcher.add(watchedFiles);
        },

        async buildStart(){
            if(resolvedConfig.command === 'build'){
                try{
                    await validateAndUpdate(this.environment?.logger ?? resolvedConfig.logger);
                     resolvedConfig.logger.info('[dotenv-gad]   ✓ Environment validated successfully.');
                }catch(err:unknown){
                    this.error(`[dotenv-gad]    ✗ Validation failed — aborting build.\n\n${String(err)}`);
                }
            }
        },

        resolveId(id: string){
            if(id === MODULE_ID || id === CLIENT_ALIAS){
                return RESOLVED_MODULE_ID;
            }
            return undefined;
        },

        load(id: string){
            if(id !== RESOLVED_MODULE_ID) return undefined;

            const json = JSON.stringify(currentFilteredEnv, null, 2);

            return [
        `// Auto-generated by dotenv-gad`,
        `// Only VITE_* keys (and explicitly whitelisted publicKeys) are included.`,
        `export const env = ${json};`,
        `export default env;`,
      ].join('\n');
        },

        async handleHotUpdate(context: HmrContext){
            const {file, server} = context;

            let normalised: string;

            try{
                normalised = realpathSync(file);
            }catch{
                normalised =  file;
            }

            const isWatched = watchedFiles.some((w) =>{
                try{
                    return realpathSync(w) ===normalised;
                }catch{
                    return w === normalised
                }
            });
            if (!isWatched) return; //vite will handle the update normally.

            server.config.logger.info(`[dotenv-gad]     detected change in ${file} — re-validating…`);

            try{
                await validateAndUpdate(server.config.logger);
               server.config.logger.info('[dotenv-gad]     ✓ Re-validation passed.');
            }catch(err:unknown){
                //In Dev Mode: Just log the failure but not to kill the server.
                server.config.logger.error(`\n[dotenv-gad]  ✗ Re-validation failed:\n${String(err)}\n`);
            }

            // So we invalidate the virtual module in Vite's module graph such that
            // any component importing it receives an updated payload via HMR.
            const virutalModule = server.moduleGraph.getModuleById(RESOLVED_MODULE_ID);
            if(virutalModule){
                server.moduleGraph.invalidateModule(virutalModule);

                return [virutalModule]
            }

            return [];
        }
    }
}