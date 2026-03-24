import { z } from "zod";
import { BaseNodeSchema } from "../common/baseNode";

// HTTP Node Schema extends both base schemas
export const ConfirmationNodeSchema = BaseNodeSchema.extend({
  type: z.literal("confirmation").openapi({
    description:
      "Specifies the node type as \`confirmation\`. Other available types include \`http\`, \`error_boundary\`, \`agent\`, \`source_iterator\`, and \`destination\`.",
    example: "confirmation",
  }),
  dependencies: z.array(z.string()).openapi({
    description: "IDs of nodes that must complete before this node can execute",
    example: ["auth_token", "user_id"],
  }),
}).openapi({
  ref: "ConfirmationNode",
  title: "ConfirmationNode",
  description:
    "A node that pauses the workflow to wait for user confirmation. You must signal the node to continue by sending a message to the node.",
  "x-tags": ["Nodes"],
});
export type ConfirmationNode = z.infer<typeof ConfirmationNodeSchema>;
