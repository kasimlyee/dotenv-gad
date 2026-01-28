type PrimitiveType = "string" | "number" | "boolean" | "date";
type ComplexType =
  | "object"
  | "array"
  | "email"
  | "url"
  | "ip"
  | "json"
  | "port";
type SchemaType = PrimitiveType | ComplexType;

export interface SchemaRule {
  type: SchemaType;
  required?: boolean;
  default?: any;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  validate?: (value: any) => boolean;
  transform?: (value: any) => any;
  sensitive?: boolean;
  docs?: string;
  enum?: any[];
  regex?: RegExp;
  regexError?: string;
  error?: string;
  items?: SchemaRule;
  properties?: Record<string, SchemaRule>;
  // Optional prefix for grouped environment variables. When set, variables
  // like `PREFIX_KEY` will be mapped into the object. If omitted but
  // `properties` exists, the default prefix `
  // <SCHEMA_KEY>_` will be used when grouping is detected.
  envPrefix?: string;
  env?: { [envName: string]: Partial<SchemaRule> };
}

export type SchemaDefinition = Record<string, SchemaRule>;

/**
 * Define a schema for a set of environment variables.
 * 
 * IMPORTANT: Use `as const` when defining schemas for type inference
 *
 * @example
 * ```typescript
 * const schema = defineSchema({
   PORT:{type: "number",default: 3000},
   DB_HOST:{type: "string", required: true},
 } as const);
 */
export function defineSchema<const S extends SchemaDefinition>(schema: S): S {
  return schema;
}
