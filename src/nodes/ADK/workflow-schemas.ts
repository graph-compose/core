import { z } from "zod";

/**
 * Result of executing an agent workflow.
 *
 * This schema defines the structure of data returned when a workflow completes,
 * whether successfully or with errors. It includes all fields from the final
 * orchestration turn PLUS workflow-level metadata.
 *
 * This is unified with TurnResult - both share the same core fields.
 */
export const AgentWorkflowExecutionResultSchema = z
  .object({
    // Core fields (from TurnResult)
    workflow_id: z
      .string()
      .describe("The ADK workflow ID used throughout the workflow"),

    final_response_text: z
      .string()
      .optional()
      .describe("Final response text from the last agent turn"),

    session_state: z
      .record(z.any())
      .default({})
      .describe("Final session state at workflow completion"),

    error_details: z
      .string()
      .nullable()
      .optional()
      .describe("Error details if the workflow or final turn failed"),

    // Turn-level signals (from final orchestration turn)
    internal_exit_flow: z
      .boolean()
      .optional()
      .describe("Whether the final turn requested workflow exit"),

    internal_wait_for_user_input: z
      .boolean()
      .optional()
      .describe("Whether the final turn is waiting for user input"),

    // Workflow-level metadata (not in turn results)
    orchestration_cycle_count: z
      .number()
      .optional()
      .describe("Total number of workflow iterations (turns) completed"),

    terminated_by_global_limit: z
      .boolean()
      .default(false)
      .describe(
        "Whether the workflow was terminated due to reaching max_orchestration_cycles",
      ),
  })
  .openapi({
    ref: "WorkflowExecutionResult",
    title: "Workflow Execution Result",
    description:
      "Result from executing an agent workflow (unified with TurnResult structure)",
  });

export type AgentWorkflowExecutionResult = z.infer<
  typeof AgentWorkflowExecutionResultSchema
>;

/**
 * Simplified schema for orchestration results returned by TemporalSessionOrchestrator.run_orchestration().
 *
 * This schema contains only the essential data needed from a single orchestration turn, with workflow control logic handled internally by the workflow itself.
 */
export const TurnResultSchema = z
  .object({
    finalResponseText: z
      .string()
      .describe("Final response text from the agent"),

    sessionState: z
      .record(z.any())
      .default({})
      .describe("Updated session state after the turn"),

    workflowId: z
      .string()
      .describe("The Temporal workflow ID that generated this result"),

    errorDetails: z
      .string()
      .optional()
      .describe("Error details if the turn failed"),

    // Internal workflow control signals (not part of the public API)
    // These are used internally by the workflow for control flow decisions
    internalExitFlow: z
      .boolean()
      .default(false)
      .describe("Internal signal for workflow termination"),

    internalWaitForUserInput: z
      .boolean()
      .default(false)
      .describe("Internal signal for user input pause"),
  })
  .openapi({
    ref: "TurnResult",
    title: "Turn Result",
    description:
      "Simplified result from running orchestration for a single turn",
  });

export type TurnResult = z.infer<typeof TurnResultSchema>;
