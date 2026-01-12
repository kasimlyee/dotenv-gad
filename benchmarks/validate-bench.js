import { EnvValidator, defineSchema } from "../dist/index.js";

const schema = defineSchema({
  PORT: { type: "port", required: true },
  NUM: { type: "number" },
  FLAGS: { type: "array", items: { type: "number" } },
  OBJ: {
    type: "object",
    properties: {
      a: { type: "string" },
      b: { type: "number" },
    },
  },
});

const v = new EnvValidator(schema);

const input = {
  PORT: "3000",
  NUM: "42",
  FLAGS: "[1,2,3]",
  OBJ: '{"a":"hello","b":123}',
};

const runs = 200000;
console.time("validation");
for (let i = 0; i < runs; i++) {
  v.validate(input);
}
console.timeEnd("validation");
console.log(`${runs} runs`);

