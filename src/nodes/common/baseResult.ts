import { z } from "zod";
import { AgentWorkflowExecutionResultSchema } from "../ADK";
import { HTTPNodeResultSchema } from "../http/result";

export const NodeResultSchema = z.object({
  // The actual response data
  data: z.union([HTTPNodeResultSchema, AgentWorkflowExecutionResultSchema]),

  // HTTP metadata (optional)
  statusCode: z.number().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export type NodeResult = z.infer<typeof NodeResultSchema>;

// NodeHttpStatus is now integrated into NodeResult - no longer needed as separate type
