import { z } from "zod";
import { HTTPConfigSchema } from "../common";
import { BaseNodeSchema } from "../common/baseNode";

// Error Boundary Node Schema
export const ErrorBoundaryNodeSchema = BaseNodeSchema.extend({
  type: z.literal("error_boundary").openapi({
    description:
      "Specifies the node type as \`error_boundary\`. Other available types include \`http\`, \`agent\`, \`source_iterator\`, and \`destination\`.",
    example: "error_boundary",
  }),
  protectedNodes: z.array(z.string()).openapi({
    description:
      "IDs of nodes that this boundary protects and handles errors for",
    example: ["fetch-user-data", "process-user-info"],
  }),
  http: HTTPConfigSchema,
}).openapi({
  ref: "ErrorBoundaryNode",
  title: "ErrorBoundaryNode",
  description:
    'A node that can protect both HTTP and Agent Nodes. Think of them like a try catch block in code. Only the most "specific" error boundary node will catch the error, the rest will be ignored.',
  "x-tags": ["Nodes"],
});
export type ErrorBoundaryNode = z.infer<typeof ErrorBoundaryNodeSchema>;
