import { z } from "zod";
import { BaseNodeSchema } from "../common/baseNode";
import { ADKWorkflowDefinitionSchema } from "./graph";

/**
 * ADK Node Schema - integrates ADK workflow definitions into the main workflow system.
 *
 * This node type allows you to embed complete ADK agent workflows as nodes within
 * larger temporal workflows, similar to how AgentLoopNode works but using the
 * Google ADK temporal orchestration system.
 */
export const AdkNodeSchema = BaseNodeSchema.extend({
  type: z.literal("adk").openapi({
    description:
      "Specifies the node type as 'adk'. Executes a complete ADK agent workflow using Google's Agent Development Kit with Temporal orchestration.",
    example: "adk",
  }),
  config: ADKWorkflowDefinitionSchema.openapi({
    description:
      "Configuration for the ADK workflow execution. This extends the ADK workflow definition with additional runtime parameters for initial prompt and chat support.",
  }),
  dependencies: z.array(z.string()).optional().openapi({
    description: "IDs of nodes that must complete before this ADK node can execute",
    example: ["fetch_user_data", "validate_input"],
  }),
}).openapi({
  ref: "AdkNode",
  title: "ADK Node",
  description:
    "A node that executes a complete ADK (Agent Development Kit) workflow with multi-agent orchestration, tool calling, and HITL support. The configuration directly contains the ADK workflow definition along with runtime parameters.",
  "x-tags": ["Nodes"],
});

export type AdkNode = z.infer<typeof AdkNodeSchema>;
