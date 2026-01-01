import { SchemaDefinition } from "../../src/schema";

const schema: SchemaDefinition = {
  VITE_DEBUG_MODE: {
    type: "boolean",
    required: false,
    default: "false"
  }
};

export default schema;
