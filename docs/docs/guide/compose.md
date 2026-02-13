---
sidebar_position: 3
---

# Schema Composition

`composeSchema` merges multiple schema definitions into one. This is useful for splitting large configurations across files or composing shared base schemas with app-specific extensions.

## Usage

```ts
import { defineSchema, composeSchema } from 'dotenv-gad';

const baseSchema = defineSchema({
  NODE_ENV: { type: 'string', default: 'development' },
  LOG_LEVEL: { type: 'string', default: 'info' },
});

const dbSchema = defineSchema({
  DATABASE_URL: { type: 'string', required: true, sensitive: true },
  DATABASE_POOL_SIZE: { type: 'number', default: 10 },
});

const schema = composeSchema(baseSchema, dbSchema);
```

## Merge behavior

- Later schemas **override** earlier ones for duplicate keys.
- You can pass any number of schemas.

```ts
const a = defineSchema({ PORT: { type: 'number', default: 3000 } });
const b = defineSchema({ PORT: { type: 'number', default: 8080 } });

const merged = composeSchema(a, b);
// PORT default is now 8080
```

## Safety

`composeSchema` uses `Object.create(null)` internally and skips `__proto__`, `constructor`, and `prototype` keys to prevent prototype pollution attacks.
