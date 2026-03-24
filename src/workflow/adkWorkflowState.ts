import { z } from "zod";

/**
 * ADK Workflow Execution State Schema
 *
 * This represents the complete execution state of an ADK (Agent Development Kit) workflow.
 * Unlike HTTP workflows which have `executed`, `results`, and `context` fields,
 * ADK workflows have a different state shape based on agent orchestration.
 *
 * All fields in this schema can be queried from running workflows and are persisted
 * to the database so they remain available after workflow termination.
 */

/**
 * Session event in the conversation history
 * Represents a single message or interaction in the agent conversation
 */
export const AdkSessionEventSchema = z
  .object({
    id: z.string().describe("Unique identifier for this session event"),
    role: z
      .enum(["user", "agent", "system"])
      .optional()
      .describe(
        "Role of the message author (may not be present in older events)",
      ),
    author: z
      .string()
      .describe("Name/identifier of the author (agent ID, 'user', etc.)"),
    content: z
      .record(z.any())
      .nullable()
      .describe("The message content object (genai Content type)"),
    timestamp: z
      .union([z.string(), z.number()])
      .describe("Event timestamp (ISO string or unix timestamp)"),
    invocation_id: z
      .string()
      .optional()
      .describe("ID of the invocation that generated this event"),
    metadata: z
      .record(z.any())
      .optional()
      .describe("Additional event metadata"),
  })
  .passthrough();

export type AdkSessionEvent = z.infer<typeof AdkSessionEventSchema>;

/**
 * Orchestration result from the latest agent execution
 *
 * This schema represents a unified result structure that includes both:
 * - Turn-level data from a single orchestration cycle (TurnResult)
 * - Workflow-level metadata (orchestration_cycle_count, terminated_by_global_limit)
 *
 * For completed workflows, this matches the WorkflowExecutionResult.
 * For querying running workflows, this is enriched with workflow metadata.
 */
export const AdkOrchestrationResultSchema = z
  .object({
    // Core fields from TurnResult
    workflow_id: z
      .string()
      .describe("The ADK session ID / Temporal workflow ID"),
    final_response_text: z
      .string()
      .optional()
      .describe("Final response text from the agent"),
    session_state: z
      .record(z.any())
      .optional()
      .describe("Updated session state after the turn"),
    error_details: z
      .string()
      .nullable()
      .optional()
      .describe("Error details if the turn failed"),

    // Turn-level signals
    internal_exit_flow: z
      .boolean()
      .optional()
      .describe("Whether the turn requested workflow exit"),
    internal_wait_for_user_input: z
      .boolean()
      .optional()
      .describe("Whether the turn is waiting for user input"),
    // Support alias for backward compatibility
    exit_flow: z.boolean().optional().describe("Alias for internal_exit_flow"),
    wait_for_user_input: z
      .boolean()
      .optional()
      .describe("Alias for internal_wait_for_user_input"),

    // Workflow-level metadata (enriched when querying)
    orchestration_cycle_count: z
      .number()
      .optional()
      .describe("Total number of workflow iterations completed"),
    terminated_by_global_limit: z
      .boolean()
      .optional()
      .describe(
        "Whether the workflow was terminated due to reaching max cycles",
      ),
  })
  .passthrough();

export type AdkOrchestrationResult = z.infer<
  typeof AdkOrchestrationResultSchema
>;

/**
 * Pending confirmation details for Human-in-the-Loop (HITL)
 * Contains information about actions awaiting user confirmation
 *
 * Note: This is stored as a dict where keys are request_ids and values are detail objects,
 * so the structure can vary. Using passthrough() and optional fields for flexibility.
 */
export const AdkPendingConfirmationSchema = z
  .object({
    request_id: z
      .string()
      .optional()
      .describe("Unique ID for this confirmation request"),
    action: z
      .string()
      .optional()
      .describe("Description of the action requiring confirmation"),
    details: z
      .record(z.any())
      .optional()
      .describe("Additional details about the pending action"),
    requested_at: z
      .union([z.string(), z.number()])
      .optional()
      .describe("When confirmation was requested"),
  })
  .passthrough();

export type AdkPendingConfirmation = z.infer<
  typeof AdkPendingConfirmationSchema
>;

/**
 * Invocation trace containing complete execution details
 * Includes workflow metadata, state, and execution history
 */
export const AdkInvocationTraceSchema = z
  .object({
    workflow_metadata: z
      .object({
        conversation_end_requested: z
          .boolean()
          .optional()
          .describe("Whether conversation end was requested"),
        orchestration_cycle_count: z
          .number()
          .optional()
          .describe("Number of orchestration cycles executed"),
        user_message_count: z
          .number()
          .optional()
          .describe("Number of user messages received"),
      })
      .passthrough()
      .optional()
      .describe("Workflow-level metadata"),

    state: z.record(z.any()).optional().describe("Current session state"),

    execution_history: z
      .array(z.record(z.any()))
      .optional()
      .describe("History of executions"),

    agents_executed: z
      .array(z.string())
      .optional()
      .describe("List of agent IDs that have been executed"),

    tools_used: z
      .array(z.string())
      .optional()
      .describe("List of tool IDs that have been used"),
  })
  .passthrough();

export type AdkInvocationTrace = z.infer<typeof AdkInvocationTraceSchema>;

/**
 * Complete ADK Workflow Execution State
 *
 * This is the main state object returned for ADK workflows.
 * It contains all queryable data that is persisted to the database.
 *
 * Usage:
 * - For RUNNING/COMPLETED workflows: Queried from Temporal
 * - For TERMINATED workflows: Retrieved from database (queries don't work)
 * - For state comparison: Both sources fetched and diffed for validation
 */
export const AdkWorkflowStateSchema = z
  .object({
    /**
     * Latest result from agent orchestration
     * From: get_latest_orchestration_result() query
     */
    latestOrchestrationResult: AdkOrchestrationResultSchema.nullable()
      .optional()
      .describe("Most recent orchestration result from the agent execution"),

    /**
     * Complete conversation history
     * From: get_session_events() query
     *
     * This is the full conversation between user(s) and agent(s),
     * including all messages, responses, and system events.
     */
    conversationHistory: z
      .array(AdkSessionEventSchema)
      .default([])
      .describe(
        "Complete conversation history (session events) for this workflow",
      ),

    /**
     * Pending HITL confirmation details
     * From: get_pending_confirmation_details() query
     *
     * Structure: Record<request_id, confirmation_details>
     * Multiple confirmations can be pending simultaneously
     */
    pendingConfirmations: z
      .record(AdkPendingConfirmationSchema)
      .nullable()
      .optional()
      .describe(
        "Dict of pending confirmations keyed by request_id. Multiple HITL requests can be pending simultaneously.",
      ),

    /**
     * Whether workflow is waiting for user confirmation
     * From: is_waiting_for_confirmation() query
     */
    isWaitingForConfirmation: z
      .boolean()
      .default(false)
      .describe(
        "True if the workflow is currently waiting for user confirmation (HITL)",
      ),

    /**
     * Complete invocation trace with execution details
     * From: get_latest_invocation_trace() query
     *
     * Contains workflow metadata, state, and execution history.
     * Use workflow_metadata.conversation_end_requested to check if conversation should end.
     */
    latestInvocationTrace: AdkInvocationTraceSchema.nullable()
      .optional()
      .describe(
        "Complete execution trace with workflow metadata, state, and history",
      ),

    /**
     * Whether the workflow has stopped (terminal state)
     * This is a DERIVED field from Temporal workflow status, not a query result.
     *
     * Terminal states: COMPLETED, FAILED, CANCELED, TERMINATED, TIMED_OUT
     */
    isStopped: z
      .boolean()
      .optional()
      .describe(
        "Whether the workflow is in a terminal state (derived from workflow status)",
      ),

    /**
     * Whether conversation end was requested
     * This is a DERIVED field extracted from: latestInvocationTrace.workflow_metadata.conversation_end_requested
     */
    conversationEndRequested: z
      .boolean()
      .optional()
      .describe(
        "Whether the agent or system requested to end the conversation (derived from invocation trace)",
      ),
  })
  .openapi({
    ref: "AdkWorkflowState",
    title: "ADK Workflow Execution State",
    description: `
Complete execution state for an ADK (Agent Development Kit) workflow.

This state shape is different from HTTP workflows and contains agent-specific data:
- Agent conversation history and orchestration results
- Human-in-the-loop (HITL) confirmation states
- Detailed execution traces and metadata

All fields (except derived ones) are queryable from Temporal and persisted to the database,
ensuring state remains accessible even after workflow termination.
  `.trim(),
    "x-tags": ["ADK Workflows", "State"],
  });

export type AdkWorkflowState = z.infer<typeof AdkWorkflowStateSchema>;

/**
 * Helper function to extract derived fields from ADK workflow state
 *
 * Some fields in the ADK state are derived from other fields:
 * - conversationEndRequested: From invocation_trace.workflow_metadata.conversation_end_requested
 * - isStopped: From Temporal workflow status (not part of query state)
 */
export function enrichAdkWorkflowState(
  baseState: Omit<AdkWorkflowState, "conversationEndRequested" | "isStopped">,
  workflowStatus?: string,
): AdkWorkflowState {
  const enriched: AdkWorkflowState = {
    ...baseState,
  };

  // Extract conversationEndRequested from invocation trace
  if (baseState.latestInvocationTrace?.workflow_metadata) {
    enriched.conversationEndRequested =
      baseState.latestInvocationTrace.workflow_metadata
        .conversation_end_requested ?? false;
  }

  // Determine if workflow is stopped from Temporal status
  if (workflowStatus) {
    const terminalStates = [
      "COMPLETED",
      "FAILED",
      "CANCELED",
      "TERMINATED",
      "TIMED_OUT",
    ];
    enriched.isStopped = terminalStates.includes(workflowStatus);
  }

  return enriched;
}
