import { z } from "zod";
import { PendingToolCallSchema } from "./function-call";
import { HitlRequestSchema } from "./hitl";

/**
 * Response schema for agent and tool HTTP services.
 *
 * User-hosted HTTP services (e.g., for LLMs, tools) that are called by the
 * orchestration system MUST structure their JSON responses to conform to this schema.
 *
 * This allows the orchestration system to reliably parse the service's output,
 * including standard content, tool calls, and signals for Human-in-the-Loop (HITL) confirmation.
 *
 * SIGNAL USAGE GUIDELINES:
 *
 * Use `escalate=True` when:
 * - You want to stop the immediate parent container (LoopAgent, SequentialAgent)
 * - The current sub-task is complete, but parent should decide next steps
 * - You need hierarchical control flow within the agent tree
 * - Example: A loop iteration is done and should exit the loop
 *
 * Use `exitFlow=True` when:
 * - The entire workflow/task is complete and should terminate
 * - A critical error occurred that requires full workflow termination
 * - The user has explicitly requested to end the entire conversation/task
 * - Example: "Task completed successfully" or "Critical error, cannot continue"
 *
 * Both signals now flow through the agent hierarchy for proper cleanup and control.
 *
 * WAITING MECHANISMS:
 *
 * Use `hitlRequest` for action confirmations:
 * - Before executing specific actions: "Book this $300 flight to SFO?"
 * - High-stakes operations: "Delete all files in this directory?"
 * - Financial transactions: "Transfer $500 to account XYZ?"
 * - Any action that needs structured approval with specific details
 *
 * Key differences:
 * - `hitlRequest`: Structured object, action-specific confirmation with details
 * - They can be used together if needed (rare cases)
 */
export const HttpResponseOutputSchema = z
  .object({
    content: z
      .string()
      .optional()
      .nullable()
      .describe(
        "The main content of the response as a simple text string. Use null for silent agents that only make tool calls without providing text content.",
      ),

    toolCalls: z
      .array(PendingToolCallSchema)
      .optional()
      .nullable()
      .describe(
        "A list of tool calls suggested by the LLM or service, pending execution by the ADK.",
      ),

    escalate: z
      .boolean()
      .optional()
      .nullable()
      .describe(
        "Container control flow signal: If true, signals to the immediate parent container agent (SequentialAgent, LoopAgent, etc.) that it should stop its current execution and pass control to its parent. This is used for hierarchical control flow within the agent tree. Common use cases: terminating a loop in LoopAgent, early exit from SequentialAgent. Scope: Affects only the immediate parent container, not the entire workflow.",
      ),

    exitFlow: z
      .boolean()
      .optional()
      .nullable()
      .describe(
        "Workflow termination signal: If true, signals that the entire workflow/flow should terminate completely. This is a definitive stop signal that indicates the task is complete or a critical condition has been met. Unlike 'escalate', this signal is intended to end the entire workflow execution, though it now flows through the agent hierarchy to allow for proper cleanup and resource management. Common use cases: task completion, critical errors, user-requested termination. Scope: Terminates the entire workflow.",
      ),

    statusCode: z
      .number()
      .int()
      .optional()
      .nullable()
      .describe(
        "HTTP status code from the underlying service call. This field is populated by the activity layer when making HTTP requests to agent services. It provides debugging information and allows workflows to programmatically inspect the HTTP-level success or failure of service calls. Common values: 200 (success), 404 (not found), 500 (server error), etc. This field is optional and may not be present for responses that don't originate from HTTP calls.",
      ),

    waitForUserInput: z
      .boolean()
      .optional()
      .nullable()
      .describe(
        "Conversational flow control: If true, indicates that the agent is waiting for the next user input to proceed.",
      ),

    hitlRequest: HitlRequestSchema.optional()
      .nullable()
      .describe(
        "Action confirmation request: If present, this object contains all necessary details for a Human-in-the-Loop confirmation of a specific action. This is used when the agent wants to execute a specific action (like booking a flight, making a purchase, deleting data) but needs explicit user approval first. The presence of this field signals that the workflow should pause and wait for user confirmation before proceeding with the proposed action.",
      ),
  })
  .openapi({
    ref: "HttpResponseOutput",
    title: "HTTP Response Output",
    description:
      "Response schema for agent and tool HTTP services, including HITL support",
    examples: [
      {
        content: "I found flights to SFO. The price is $300. Shall I book it?",
        toolCalls: [
          {
            id: "call_sfo_book_flight",
            function_name: "book_flight",
            function_args: { destination: "SFO", price: 300 },
          },
        ],
        exitFlow: false,
        hitlRequest: {
          prompt: "Book flight to SFO for $300?",
          actionDetails: {
            tool_name: "book_flight",
            flight_id: "FL123",
            price: 300,
            destination: "SFO",
          },
        },
      },
      {
        content: "I have processed your request about the weather.",
        toolCalls: undefined,
        exitFlow: true,
        hitlRequest: undefined,
      },
      {
        content: undefined, // Silent agent only makes tool calls
        toolCalls: [
          {
            id: "call_search",
            function_name: "search_data",
            function_args: { query: "user request" },
          },
        ],
        exitFlow: false,
        hitlRequest: undefined,
      },
      {
        content: "Tool executed successfully. Result: {'data': 'sample'}",
        toolCalls: undefined,
        exitFlow: undefined, // Typically not set by a simple tool, LLM decides flow completion
        hitlRequest: undefined,
      },
    ],
  });

export type HttpResponseOutput = z.infer<typeof HttpResponseOutputSchema>;
