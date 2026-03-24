import { z } from "zod";

// Export all the schemas from their respective files
export * from "./ADK"; // Add ADK exports
export * from "./common";
export * from "./confirmation";
export * from "./destination";
export * from "./errorBoundary";
export * from "./forEach";
export * from "./http";
export * from "./iterator";

import { AdkNodeSchema } from "./ADK/node"; // Import ADK node
import { DestinationNodeSchema } from "./destination/node";
import { ErrorBoundaryNodeSchema } from "./errorBoundary";
import { ForEachNodeSchema, EndForEachNodeSchema } from "./forEach/node";
import { HttpNodeSchema } from "./http/node";
import { IteratorNodeSchema } from "./iterator/node";
import { ConfirmationNodeSchema } from "./confirmation";

// Define the NodeSchema after all exports to avoid circular dependencies
export const NodeSchema = z
  .discriminatedUnion("type", [
    HttpNodeSchema,
    ErrorBoundaryNodeSchema,
    IteratorNodeSchema,
    DestinationNodeSchema,
    ConfirmationNodeSchema,
    AdkNodeSchema,
    ForEachNodeSchema,
    EndForEachNodeSchema,
    // Note: ToolNodeSchema is not included here to avoid circular dependencies
  ])
  .openapi({
    ref: "Node",
    title: "Node",
    description: "A node in the workflows",
    "x-tags": ["Nodes"],
  });

export type Node = z.infer<typeof NodeSchema>;
