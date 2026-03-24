import { z } from "zod";

/**
 * Input schema for the HTTP_AGENT_ACTIVITY.
 */
export const HTTPAgentActivityInputSchema = z
  .object({
    agent_id: z
      .string()
      .describe("The ID of the agent that is making the HTTP request."),
    url: z
      .string()
      .describe(
        "The URL to which the HTTP request will be made. Can be a string with templates like {{$secret('key')}} or {{state.key}}.",
      ),
    method: z
      .enum(["GET", "POST", "PUT", "DELETE", "PATCH"])
      .describe("The HTTP method to use (e.g., 'GET', 'POST')."),

    headers: z
      .record(z.string())
      .optional()
      .describe("A dictionary of HTTP headers to include in the request."),

    body: z
      .record(z.any())
      .optional()
      .describe(
        "The body of the request, typically a JSON serializable dictionary.",
      ),

    org_id: z
      .string()
      .optional()
      .describe(
        "The organization ID for secret resolution. If not provided, secrets will not be resolved.",
      ),
  })
  .openapi({
    ref: "HTTPAgentActivityInput",
    title: "HTTP Agent Activity Input",
    description: "Input schema for the HTTP_AGENT_ACTIVITY",
  });

export type HTTPAgentActivityInput = z.infer<
  typeof HTTPAgentActivityInputSchema
>;

/**
 * A function call in HTTP content, simplified from ADK FunctionCall.
 */
export const HttpFunctionCallSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe(
        "Optional unique identifier for the function call, used for tracking or referencing.",
      ),

    name: z
      .string()
      .optional()
      .describe("Required. The name of the function to call."),

    args: z
      .record(z.any())
      .optional()
      .describe(
        "Optional. The function parameters and values in JSON object format.",
      ),
  })
  .passthrough()
  .openapi({
    ref: "HttpFunctionCall",
    title: "HTTP Function Call",
    description: "A function call in HTTP content",
  });

export type HttpFunctionCall = z.infer<typeof HttpFunctionCallSchema>;

/**
 * A function response in HTTP content, simplified from ADK FunctionResponse.
 *
 * Note: For silent agents (function-response-only), the 'id' field should be null
 * to match native ADK behavior where Part.from_function_response() creates
 * FunctionResponse objects with id=null by default.
 */
export const HttpFunctionResponseSchema = z
  .object({
    id: z
      .string()
      .nullable()
      .optional()
      .describe(
        "Optional. The id of the function call this response is for. For silent agents, this should be null.",
      ),

    name: z
      .string()
      .optional()
      .describe(
        "Required. The name of the function. Matches the corresponding function call name.",
      ),

    response: z
      .record(z.any())
      .optional()
      .describe(
        'Required. The function response in JSON object format. Use "output" key to specify function output and "error" key for errors.',
      ),
  })
  .passthrough()
  .openapi({
    ref: "HttpFunctionResponse",
    title: "HTTP Function Response",
    description: "A function response in HTTP content",
  });

export type HttpFunctionResponse = z.infer<typeof HttpFunctionResponseSchema>;

/**
 * Defines the structure for a tool call suggested by an LLM or service, pending execution.
 */
export const PendingToolCallSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe(
        "An optional unique identifier for the tool call, which can be used for tracking or referencing.",
      ),

    function_name: z
      .string()
      .describe("The name of the function or tool to be called."),
    function_args: z
      .record(z.any())
      .describe("The arguments to pass to the function, as a JSON object."),
    call_id: z
      .string()
      .optional()
      .describe(
        "An optional unique identifier for the tool call, which can be used for tracking or referencing. (OpenAI only)",
      ),
  })
  .passthrough()
  .openapi({
    ref: "PendingToolCall",
    title: "Pending Tool Call",
    description:
      "A tool call suggested by an LLM or service, pending execution",
  });

export type PendingToolCall = z.infer<typeof PendingToolCallSchema>;
