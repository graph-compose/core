import { z } from "zod";
import { HTTPConfigSchema, NodeConditionsSchema } from "../common";
import { BaseNodeSchema } from "../common/baseNode";
import { ValidationSchema } from "../common/validationSchema";

// HTTP Node Schema extends both base schemas
export const HttpNodeSchema = BaseNodeSchema.extend({
  type: z.literal("http").openapi({
    description:
      "Specifies the node type as \`http\`. Other available types include \`error_boundary\`, \`agent\`, \`source_iterator\`, and \`destination\`.",
    example: "http",
  }),
  dependencies: z.array(z.string()).openapi({
    description: "IDs of nodes that must complete before this node can execute",
    example: ["auth_token", "user_id"],
  }),
  http: HTTPConfigSchema,
  outputMapping: z.record(z.string(), z.string()).optional().openapi({
    description:
      "Optional mapping to reshape the HTTP response before storing. Each key becomes a field in `data`, " +
      "and each value is a JSONata expression evaluated against the raw response (`data`, `statusCode`, `headers`). " +
      "When set, the raw response is preserved in `_rawData` for debugging. " +
      "Downstream nodes see `{{ results.<nodeId>.data.<mappedKey> }}` instead of the raw API shape.",
    example: {
      email: "{{ data.profile.email }}",
      fullName: "{{ data.firstName & ' ' & data.lastName }}",
    },
  }),
  validation: ValidationSchema.optional(),
  conditions: NodeConditionsSchema.optional(),
}).openapi({
  ref: "HttpNode",
  title: "HttpNode",
  description: "A node that makes HTTP requests",
  "x-tags": ["Nodes"],
});
export type HttpNode = z.infer<typeof HttpNodeSchema>;
