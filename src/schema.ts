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
  env?: { [envName: string]: Partial<SchemaRule> };
}

export type SchemaDefinition = Record<string, SchemaRule>;

/**
 * Define a schema for a set of environment variables.
 *
 * @param schema A record where each key is the name of an environment variable
 * and the value is a `SchemaRule` object that defines the rules for that
 * variable.
 */
export function defineSchema(schema: SchemaDefinition) {
  return schema;
}
