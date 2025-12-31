import { SchemaDefinition, SchemaRule } from "./schema.js";
import { AggregateError } from "./errors.js";

export class EnvValidator {
  private errors: {
    key: string;
    message: string;
    value?: any;
    rule?: SchemaRule;
  }[] = [];

  /**
   * Constructs a new EnvValidator instance.
   * @param {SchemaDefinition} schema The schema definition for the environment variables.
   * @param {Object} [options] Optional options for the validation process.
   * @param {boolean} [options.strict] When true, environment variables not present in the schema will be rejected.
   */
  constructor(
    private schema: SchemaDefinition,
    private options?: { strict?: boolean }
  ) {}

  validate(env: Record<string, string | undefined>) {
    this.errors = [];

    const result: Record<string, any> = {};

    for (const [key, rule] of Object.entries(this.schema)) {
      try {
        result[key] = this.validateKey(key, rule, env[key]);
      } catch (error) {
        if (error instanceof Error) {
          this.errors.push({
            key,
            message: error.message,
            value: env[key],
            rule,
          });
        }
      }
    }

    if (this.errors.length > 0) {
      const keys = this.errors.map((e) => e.key).join(", ");
      throw new AggregateError(
        this.errors,
        `Environment validation failed: ${keys}`
      );
    }

    if (this.options?.strict) {
      const extraVars = Object.keys(env).filter((k) => !(k in this.schema));
      if (extraVars.length > 0) {
        throw new Error(
          `Unexpected environment variables: ${extraVars.join(", ")}`
        );
      }
    }
    return result;
  }


  private validateKey(key: string, rule: SchemaRule, value: any) {
    const effectiveRule = this.getEffectiveRule(key, rule);
    if (value === undefined || value === "") {
      if (effectiveRule.required)
        throw new Error(`Missing required environment variable`);
      return effectiveRule.default;
    }

    if (effectiveRule.transform) {
      value = effectiveRule.transform(value);
    }

    switch (effectiveRule.type) {
      case "string":
        value = String(value).trim();
        if (effectiveRule.minLength && value.length < effectiveRule.minLength) {
          throw new Error(
            `Environment variable ${key} must be at least ${effectiveRule.minLength} characters`
          );
        }
        if (effectiveRule.maxLength && value.length > effectiveRule.maxLength) {
          throw new Error(
            `Environment variable ${key} must be at most ${effectiveRule.maxLength} characters`
          );
        }
        break;

      case "number":
        value = Number(value);
        if (isNaN(value)) {
          throw new Error(`Environment variable ${key} must be a number`);
        }
        if (effectiveRule.min !== undefined && value < effectiveRule.min) {
          throw new Error(
            `Environment variable ${key} must be at least ${effectiveRule.min}`
          );
        }
        if (effectiveRule.max !== undefined && value > effectiveRule.max) {
          throw new Error(
            `Environment variable ${key} must be at most ${effectiveRule.max}`
          );
        }
        break;

      case "boolean":
        if (typeof value === "string") {
          value = value.toLowerCase();

          if (value === "true") {
            value = true;
          } else if (value === "false") {
            value = false;
          }
        }

        if (typeof value !== "boolean") {
          throw new Error(
            `Environment variable ${key} must be a boolean (true/false)`
          );
        }
        value = Boolean(value);
        break;

      case "date":
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(`Environment variable ${key} must be a valid date`);
        }
        value = date;
        break;

      case "url":
        try {
          new URL(String(value));
        } catch {
          throw new Error("Must be a valid URL");
        }
        break;

      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          throw new Error("Must be a valid email");
        }
        break;

      case "ip":
        if (!/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(String(value))) {
           throw new Error("Must be a valid IP address");
        }
        break;
      case "port":
        const port = Number(value);
        if (isNaN(port)) throw new Error("Must be a number");
        if (port < 1 || port > 65535) {
          throw new Error("Must be between 1 and 65535");
        }
        break;

      case "json":
        try {
          value = JSON.parse(value);
        } catch {
          throw new Error("Must be valid JSON");
        }
        break;

      case "array":
        if (!Array.isArray(value)) {
          try {
            value = JSON.parse(value);
          } catch {
            throw new Error("Must be a valid array or JSON array string");
          }
        }

        if (effectiveRule.items) {
          value = value.map((item: any, i: any) => {
            try {
              return this.validateKey(
                `${key}[${i}]`,
                effectiveRule.items!,
                item
              );
            } catch (error: any) {
              throw new Error(`Array item '${i}':${error.message}`);
            }
          });
        }
        break;

      case "object":
        if (typeof value === "string") {
          try {
            value = JSON.parse(value);
          } catch {
            throw new Error("Must be a valid object or JSON string");
          }
        }

        if (effectiveRule.properties) {
          const obj: Record<string, any> = {};
          for (const [prop, propRule] of Object.entries(
            effectiveRule.properties
          )) {
            try {
              obj[prop] = this.validateKey(
                `${key}.${prop}`,
                propRule,
                value[prop]
              );
            } catch (error: any) {
              throw new Error(`Property '${prop}':${error.message}`);
            }
          }
          value = obj;
        }
        break;
    }

    if (effectiveRule.enum && !effectiveRule.enum.includes(value)) {
      throw new Error(
        `Environment variable ${key} must be one of ${effectiveRule.enum.join(
          ", "
        )}`
      );
    }

    if (effectiveRule.regex && !effectiveRule.regex.test(String(value))) {
      throw new Error(
        effectiveRule.regexError ||
          `Environment variable ${key} must match ${effectiveRule.regex}`
      );
    }

    if (effectiveRule.validate && !effectiveRule.validate(value)) {
      throw new Error(effectiveRule.error || "Custom validation failed");
    }

    return value;
  }

  private getEffectiveRule(key: string, rule: SchemaRule) {
    const envName = process.env.NODE_ENV || "development";
    const envRule = rule.env?.[envName] || {};
    return { ...rule, ...envRule };
  }
}
