import type { SchemaDefinition, SchemaRule } from "./schema.js";
/**
 * Type inference utilities for dotenv-gad.
 * This provides autocomplete and type safety for environment variables.
 */


type TypeFromSchemaRule<T extends SchemaRule> = T['enum'] extends ReadonlyArray<infer E> ? E:
T['type'] extends 'string' | 'email' | 'url' | 'ip' ? string :
T['type'] extends 'number' | 'port' ? number :
T['type'] extends 'boolean' ? boolean :
T['type'] extends 'date' ? Date :
T['type'] extends 'json'? any:
T['type'] extends 'array' ? T['items'] extends SchemaRule ? Array<TypeFromSchemaRule<T['items']>> : any[] :
T['type'] extends 'object' ? T['properties'] extends Record<string,SchemaRule> ? {[K in keyof T['properties']]: TypeFromSchemaRule<T['properties'][K]>}: Record<string,any> : any;


/**
 * A property is optional if required is explicitly false or
 * required is not set and no default is provided.
 */
type IsOptional<T extends SchemaRule> = T['required'] extends true ? false : T['default'] extends undefined ? true : false;


/**
 * Convert schema rule to Optional or Required type
 */
type PropertyToType<T extends SchemaRule> = IsOptional<T> extends  true ? TypeFromSchemaRule<T> | undefined : TypeFromSchemaRule<T>;



export type InferEnv<S extends SchemaDefinition> = {
    [K in keyof S]: PropertyToType<S[K]>;
}


/**
 * Utility type to extract the environment type from a schema
 * 
 * Usage:
 *      type MyEnv = ExtractEnv<typeof mySchema>
 */
export type ExtractEnv<S> = S extends SchemaDefinition ? InferEnv<S> : never