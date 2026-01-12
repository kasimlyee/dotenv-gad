# Schema Reference

The schema is a `Record<string, SchemaRule>` where `SchemaRule` includes the following fields:

- `type` — one of `string`, `number`, `boolean`, `date`, `object`, `array`, `email`, `url`, `ip`, `json`, `port`
- `required` — boolean
- `default` — any
- `min`, `max`, `minLength`, `maxLength`
- `validate` — `(value) => boolean` custom validator
- `transform` — `(value) => any` value transform
- `sensitive` — boolean; when true this value is masked in errors and excluded from `.env.example`
- `docs` — string documentation
- `enum` — array of allowed values
- `regex` / `regexError`
- `items` — `SchemaRule` for array items
- `properties` — `Record<string, SchemaRule>` for `object` types
- `envPrefix` — optional string used to map grouped envs into `object` properties (defaults to `<KEY>_` when `properties` exists)

Example:

```ts
{
  DATABASE: {
    type: 'object',
    properties: {
      HOST: { type: 'string' },
      PORT: { type: 'port', default: 5432 }
    }
  }
}
```
