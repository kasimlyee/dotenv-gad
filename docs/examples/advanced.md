# Advanced validation patterns

Custom validators and transforms let you encode domain-specific checks succinctly.

Custom validator example:

```ts
const schema = defineSchema({
  PASSWORD: {
    type: 'string',
    required: true,
    validate: (v) => v.length >= 8 && /[A-Z]/.test(v),
    error: 'Password must be 8+ chars and include an uppercase letter'
  }
});
```

Transform example (comma-separated flags):

```ts
const schema = defineSchema({
  FEATURES: {
    type: 'array',
    transform: (v) => String(v).split(',').map((s) => s.trim()),
  }
});
```

Combining grouping and custom validators:

```ts
const schema = defineSchema({
  DATABASE: {
    type: 'object',
    properties: {
      HOST: { type: 'string', required: true },
      PORT: { type: 'port', default: 5432 },
      PWD: { type: 'string', sensitive: true },
    }
  }
});

// Prefixed envs like DATABASE_HOST and DATABASE_PWD will be validated
```

Tips
- Prefer small, focused custom validators that return boolean and use the `error` message for clarity.
- Use `transform` to normalize common inputs (trim, split CSVs, parse numbers with defaults) before validation rules run.
