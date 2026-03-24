import { z } from "zod";
import { NodeResultSchema } from "../nodes/common/baseResult";
import { GlobalContextSchema } from "./context";

export const GraphWorkflowStateSchema = z.object({
  context: GlobalContextSchema.openapi({
    description:
      "The current global context object for the workflow execution. Contains initial context merged with any updates made during the workflow run.",
    example: {
      userId: "user123",
      tenantId: "tenant-abc",
      apiKey: "INITIAL_KEY",
      intermediateResult: { status: "processed" },
    },
  }),
  executed: z
    .array(z.string())
    .default([])
    .openapi({
      description:
        "An array containing the IDs of all nodes that have completed execution (successfully or with failure) so far in this workflow instance.",
      example: ["start_node", "fetch_user", "process_data"],
    }),
  results: z
    .record(z.string(), NodeResultSchema)
    .default({})
    .openapi({
      description:
        "A record mapping node IDs to their complete results including data, HTTP status, and metadata in a unified structure.",
      example: {
        fetch_user: {
          data: { id: "user123", name: "Alice" },
          statusCode: 200,
          headers: { "content-type": "application/json" },
        },
        process_data: {
          data: { processed: true, items_count: 5 },
        },
      },
    }),
});

export type GraphWorkflowState = z.infer<typeof GraphWorkflowStateSchema>;

export const WorkflowInfoSchema = z.object({
  orgId: z.string(),
  workflowId: z.string(),
  rootParentWorkflowId: z.string().optional(), // UUID of root parent workflow (for nested children)
});

export type WorkflowInfo = z.infer<typeof WorkflowInfoSchema>;
