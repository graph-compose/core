import { z } from "zod";
import { ActivityConfigSchema } from "./activityConfig";

export const IterationContextSchema = z.object({
  item: z.any(),
  originalNodeId: z.string(),
  iteratorNodeId: z.string(),
  index: z.number(),
});

// Base schema for all nodes
export const BaseNodeSchema = z
  .object({
    id: z.string().openapi({
      description:
        "Unique identifier for the node. This cannot have dashes in the name and must use underscores for spacing",
      example: "fetch_user_data",
    }),
    type: z
      .union([
        z.literal("http"),
        z.literal("error_boundary"),
        z.literal("agent"),
        z.literal("tool"),
        z.literal("source_iterator"),
        z.literal("destination"),
        z.literal("confirmation"),
        z.literal("adk"),
        z.literal("forEach"),
        z.literal("endForEach"),
      ])
      .openapi({
        description:
          "Specifies the node's type, determining its behavior and configuration. Available types: \`http\`, \`error_boundary\`, \`agent\`, \`source_iterator\`, \`destination\`, \`forEach\`, \`adk\`. (Note: \`tool\` type exists but is used within the separate 'tools' definition).",
        example: "http",
      }),

    activityConfig: ActivityConfigSchema.optional().openapi({
      description:
        "Optional configuration for the execution behavior of this specific node, such as timeouts and retry strategies. \n\nIf omitted or partially defined, default values based on your subscription tier will be applied. See ActivityConfig for details on individual properties.",
    }),
    strict: z.boolean().optional().openapi({
      description:
        "When true, the node fails before making the HTTP call if any JSONata expression resolves to undefined. Useful for catching typos like `{{ results.node.data.emial }}` instead of silently sending a request with missing fields. Default: false.",
      example: true,
    }),
  })
  .openapi({
    ref: "BaseNode",
    description:
      "Base schema for all node types (http, error_boundary, agent, tool, iterator, forEach, adk)",
  });
