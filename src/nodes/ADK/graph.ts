import { z } from "zod";
import { AgentConfigSchema } from "./agents";
import { GlobalToolDefinitionSchema } from "./tools";

/**
 * Complete workflow definition schema - matches Python AgentWorkflowSchema.
 * Uses camelCase field names that auto-convert to snake_case in ADK.
 */
export const ADKWorkflowDefinitionSchema = z
  .object({
    globalTools: z
      .array(GlobalToolDefinitionSchema)
      .optional()
      .default([])
      .describe(
        "A list of globally defined tools (HTTP or Agent-based) available to agents in this workflow.",
      ),

    agents: z
      .array(AgentConfigSchema)
      .describe("List of all agent configurations in this workflow."),

    rootAgentId: z
      .string()
      .describe(
        "The ID of the agent that serves as the entry point for this workflow.",
      ),

    maxOrchestrationCycles: z.number().int().positive().optional()
      .describe(`Global maximum number of workflow iterations (turns) allowed for autonomous workflows.

OVERVIEW:
This setting provides a safety limit for autonomous workflows to prevent runaway execution.
It counts workflow-level iterations (turns), not individual agent executions within each turn.

WHAT COUNTS AS A WORKFLOW ITERATION:
- Each call to run_orchestration() in the main workflow loop = 1 iteration
- Parallel agents running concurrently within a turn = still 1 iteration  
- Sequential agents running within a turn = still 1 iteration
- Multiple tool calls within a single agent turn = still 1 iteration

AUTONOMOUS VS INTERACTIVE WORKFLOWS:
- Interactive workflows (with human input): This limit typically not enforced
- Autonomous workflows (no human input after start): This limit is enforced
- Mixed workflows: Limit can be selectively applied

TERMINATION BEHAVIOR:
When maxOrchestrationCycles is reached:
- The workflow terminates gracefully with status indicating limit reached
- No error/exception is thrown - this is normal completion for autonomous workflows
- Session state preserves the iteration count and termination reason`),

    state: z.record(z.any()).optional()
      .describe(`Initial state to seed the workflow session with data from external workflows.

OVERVIEW:
This field allows seeding the ADK workflow session with pre-existing state from your TypeScript workflows or other external systems. The state follows the same patterns used in your broader workflow ecosystem.

STATE STRUCTURE:
The state object supports nested key-value pairs organized by node IDs and contexts:
- state.node_id.key: Persistent state values associated with specific workflow nodes
- context.node_id.key: Contextual data associated with specific workflow nodes
- Custom keys: Any other structured data your workflow needs

INTEGRATION WITH TYPESCRIPT WORKFLOWS:
When transitioning from TypeScript workflows to ADK Temporal workflows:
{
  "state": {
    "user_profile": {
      "name": "John Doe",
      "preferences": {"language": "en", "timezone": "UTC"}
    },
    "booking_context": {
      "destination": "Tokyo", 
      "dates": {"start": "2024-01-15", "end": "2024-01-22"}
    }
  }
}

AGENT ACCESS TO STATE:
Agents receive this state through their HTTP service calls in the "state" field.
State persists across workflow replays and continuations.`),
    initialUserInput: z.string().optional().openapi({
      description:
        "Optional initial user input to seed the ADK workflow when it starts. This becomes the initial_user_input parameter.",
      example: "Process the user's request for a weather report",
    }),
    description: z
      .string()
      .optional()
      .describe("Optional description of what this workflow does"),
    metadata: z
      .record(z.any())
      .optional()
      .describe(
        "Additional metadata for this workflow. You don't need to use this for anything.",
      ),
  })
  .openapi({    ref: "WorkflowDefinition",
    title: "Workflow Definition",
    description:
      "Complete workflow definition schema for ADK temporal orchestration - matches Python AgentWorkflowSchema",
  });

export type ADKWorkflowDefinition = z.infer<typeof ADKWorkflowDefinitionSchema>;
