import { z } from "zod";

// Define a simple JSON schema validation type
export const JSONSchemaValidationSchema = z.object({}).passthrough().openapi({
  description:
    "JSON validation schema to validate data. This can be derived from a zod schema. See https://json-schema.org for more info.",
});

// Define the validation schema
export const ValidationSchema = z
  .object({
    input: JSONSchemaValidationSchema.openapi({
      description:
        "Schema to validate the input data against before execution.",
      example: {
        type: "object",
        properties: {
          userId: { type: "string" },
        },
      },
    }).optional(),
    output: JSONSchemaValidationSchema.openapi({
      description: "Schema to validate the output of the node after execution.",
      example: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
        },
      },
    }).optional(),
  })
  .openapi({
    ref: "ValidationSchema",
    description:
      "Validation schema for the input/payload of the node and the output of the node. See https://json-schema.org for more info.",
    "x-tags": ["Validation"],
  });

export type ValidationSchema = z.infer<typeof ValidationSchema>;
