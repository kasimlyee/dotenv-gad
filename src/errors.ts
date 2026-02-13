import { SchemaRule } from "./schema.js";

export class EnvValidationError extends Error {
  constructor(
    public key: string,
    public message: string,
    public receiveValue?: unknown
  ) {
    super(message);
    this.name = "EnvValidationError";
  }
}

export class EnvAggregateError extends Error {
  constructor(
    public errors: {
      key: string;
      message: string;
      value?: any;
      rule?: SchemaRule;
    }[],
    message: string
  ) {
    super(message);
    this.name = "EnvAggregateError";
    Object.setPrototypeOf(this, EnvAggregateError.prototype);
  }

  toString() {
    const errorList = this.errors
      .map((e) => {
        let msg = `  - ${e.key}: ${e.message}`;
        if (e.value !== undefined)
          msg += ` (received: ${JSON.stringify(e.value)})`;
        if (e.rule?.docs) msg += `\n    ${e.rule.docs}`;
        return msg;
      })
      .join("\n");
    return `${this.message}:\n${errorList}`;
  }
}

/** @deprecated Use `EnvAggregateError` instead — avoids shadowing the built-in `AggregateError`. */
export const AggregateError = EnvAggregateError;
