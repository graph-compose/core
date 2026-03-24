import { z } from "zod";

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
  .openapi({
    ref: "HttpFunctionCall",
    title: "HTTP Function Call",
    description: "A function call in HTTP content",
    examples: [
      {
        id: "call_abc123",
        name: "get_current_weather",
        args: {
          location: "San Francisco, CA",
          unit: "celsius",
        },
      },
    ],
  });

export type HttpFunctionCall = z.infer<typeof HttpFunctionCallSchema>;

/**
 * A function response in HTTP content, simplified from ADK FunctionResponse.
 *
 * Note: For silent agents (function-response-only), the 'id' field should be None
 * to match native ADK behavior where Part.from_function_response() creates
 * FunctionResponse objects with id=None by default.
 */
export const HttpFunctionResponseSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe(
        "Optional. The id of the function call this response is for. For silent agents, this should be None.",
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
  .openapi({
    ref: "HttpFunctionResponse",
    title: "HTTP Function Response",
    description: "A function response in HTTP content",
    examples: [
      {
        id: "call_abc123",
        name: "get_current_weather",
        response: {
          output: "The weather in San Francisco is 72°F and sunny.",
          metadata: { source: "weather_api" },
        },
      },
    ],
  });

export type HttpFunctionResponse = z.infer<typeof HttpFunctionResponseSchema>;

/**
 * Defines the structure for a tool call suggested by an LLM or service, pending execution.
 *
 * If a user's HTTP service (e.g., an LLM service) determines that one or more tools
 * should be called, it should include a list of objects conforming to this schema
 * in the 'toolCalls' field of its JSON response (which itself adheres to AgentResponse).
 * This informs the orchestration system that a tool execution is requested.
 */
export const PendingToolCallSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe(
        "An optional unique identifier for the tool call, which can be used for tracking or referencing a tool invocation if the LLM provides it.",
      ),

    function_name: z
      .string()
      .describe("The name of the function or tool to be called."),

    function_args: z
      .record(z.any())
      .describe("The arguments to pass to the function, as a JSON object."),
  })
  .passthrough()
  .openapi({
    ref: "PendingToolCall",
    title: "Pending Tool Call",
    description:
      "Structure for a tool call suggested by an LLM or service, pending execution",
    examples: [
      {
        id: "tool_call_001",
        function_name: "search_flights",
        function_args: {
          destination: "New York",
          date: "2024-12-25",
        },
      },
    ],
  });

export type PendingToolCall = z.infer<typeof PendingToolCallSchema>;
