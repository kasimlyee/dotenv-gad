import { SchemaRule } from "./schema.js";


const kValidationError = Symbol.for("dotenv-gad.EnvValidationError");
const kAggregateError  = Symbol.for("dotenv-gad.EnvAggregateError");

export class EnvValidationError extends Error {
  constructor(
    public key: string,
    public message: string,
    public receiveValue?: unknown
  ) {
    super(message);
    this.name = "EnvValidationError";
    Object.defineProperty(this, kValidationError, { value: true, enumerable: false });
  }

  
  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      typeof instance === "object" &&
      instance !== null &&
      Object.prototype.hasOwnProperty.call(instance, kValidationError)
    );
  }
}

// So I lock this constructor.name at module load time so Node.js uncaught exception
// display always shows "EnvValidationError" even if the bundler renamed the class.
Object.defineProperty(EnvValidationError, "name", {
  value: "EnvValidationError",
  configurable: true,
  writable: false,
});

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
    Object.defineProperty(this, kAggregateError, { value: true, enumerable: false });
    Object.setPrototypeOf(this, EnvAggregateError.prototype);
  }

 
  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      typeof instance === "object" &&
      instance !== null &&
      Object.prototype.hasOwnProperty.call(instance, kAggregateError)
    );
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


Object.defineProperty(EnvAggregateError, "name", {
  value: "EnvAggregateError",
  configurable: true,
  writable: false,
});

/** @deprecated Use `EnvAggregateError` instead — avoids shadowing the built-in `AggregateError`. */
export const AggregateError = EnvAggregateError;