import { z } from "zod";

/**
 * HTTP Content Part Schema
 *
 * Represents a content part in HTTP message content. This is used within the ADK
 * message content structure for text-based content parts.
 *
 * @source Derived from ADK's content part structures used in agent communications
 */
const HttpContentPartSchema = z
  .object({
    type: z
      .literal("text")
      .describe(
        "The type of content part - currently only 'text' is supported",
      ),
    text: z
      .string()
      .optional()
      .describe("The text content of this content part"),
  })
  .openapi({
    title: "HttpContentPart",
    description:
      "A content part in HTTP message content, representing text-based content",
    example: {
      type: "text",
      text: "Hello, how can I help you today?",
    },
  });

/**
 * HTTP Tool Activity Output Schema
 *
 * Matches HttpToolActivityOutput from adk-python/src/google/adk/temporal/schemas/http_tool_activity.py
 *
 * This schema defines the structure returned by Python Temporal activities when executing
 * HTTP tool calls. This is what the Python ACTIVITY returns to the workflow, NOT what
 * tool endpoints return directly. Tool endpoints should return their raw results, and
 * the Python activity wraps them in this standardized format.
 *
 * The Python activity (execute_http_tool_activity) makes HTTP requests to user-hosted
 * tool services and wraps the raw HTTP response in this structure for consistent
 * handling by the workflow orchestrator.
 *
 * @source adk-python/src/google/adk/temporal/schemas/http_tool_activity.py::HttpToolActivityOutput
 */
const HttpToolActivityOutputSchema = z
  .object({
    status_code: z
      .number()
      .int()
      .describe("The HTTP status code from the tool endpoint"),
    body: z
      .union([z.record(z.any()), z.string(), z.null()])
      .optional()
      .describe(
        "The parsed JSON or raw text body from the tool's HTTP response. Can be a JSON object, string, or null",
      ),
    headers: z
      .record(z.string())
      .describe("The response headers from the tool endpoint"),
    error: z
      .string()
      .optional()
      .nullable()
      .describe(
        "An error message if the HTTP request itself failed (e.g., network error, timeout)",
      ),
  })
  .openapi({
    title: "HttpToolActivityOutput",
    description:
      "Output structure from Python Temporal activities executing HTTP tool calls. " +
      "This wraps the raw HTTP response from user-hosted tool services in a standardized format.",
    example: {
      status_code: 200,
      body: {
        output: "The weather in San Francisco is 72°F and sunny.",
        status: "success",
      },
      headers: {
        "Content-Type": "application/json",
        "X-Response-Time": "120ms",
      },
      error: null,
    },
  });

/**
 * ADK Message Content Schema
 *
 * Used in LLM request/response cycles and agent-to-agent communication within
 * the temporal orchestration system.
 *
 * @source Based on ADK message content structures and LLM request schemas from
 *         adk-python/src/google/adk/temporal/schemas/llm_request_schemas.py
 */
const AdkMessageContentSchema = z
  .object({
    text: z.string().optional().describe("Text content of the message"),
    function_call: z
      .object({
        id: z.string().describe("Unique identifier for the function call"),
        name: z.string().describe("Name of the function being called"),
        args: z
          .record(z.any())
          .describe("Arguments passed to the function as key-value pairs"),
      })
      .optional()
      .describe(
        "Function call information when the message contains a tool call",
      ),
    function_response: z
      .object({
        id: z
          .string()
          .describe("ID of the function call this response corresponds to"),
        name: z.string().describe("Name of the function that was called"),
        response: z
          .any()
          .describe("The response data from the function execution"),
      })
      .optional()
      .describe(
        "Function response information when the message contains a tool response",
      ),
  })
  .openapi({
    title: "AdkMessageContent",
    description:
      "Content structure for messages in ADK agent communications, supporting both " +
      "text content and structured function calls/responses",
    example: {
      text: "I'll help you check the weather.",
      function_call: {
        id: "call_abc123",
        name: "get_current_weather",
        args: {
          location: "San Francisco, CA",
          unit: "celsius",
        },
      },
    },
  });

/**
 * ADK Request Body Schema
 *
 * Matches the LlmHttpRequestBody structure from adk-python/src/google/adk/temporal/schemas/llm_request_schemas.py
 *
 * This schema defines the HTTP request body structure that user-hosted LLM services
 * receive when called by TemporalLlm via HTTP_AGENT_ACTIVITY. It includes the complete
 * conversation history, available tools, model configuration, and session state.
 *
 * The Python TemporalLlm component constructs requests in this format when making
 * HTTP calls to user-hosted LLM endpoints through Temporal activities.
 *
 * @source adk-python/src/google/adk/temporal/schemas/llm_request_schemas.py::LlmHttpRequestBody
 */
export const AdkRequestBodySchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z
            .enum(["system", "user", "assistant", "tool"])
            .describe("The role of the message sender"),
          content: z
            .union([z.string(), z.array(AdkMessageContentSchema)])
            .describe(
              "The message content - can be simple text or structured content parts",
            ),
        }),
      )
      .describe("The conversation history as a list of messages"),
    state: z
      .record(z.any())
      .optional()
      .describe("Session state data injected from the workflow context"),
    tools: z
      .array(
        z.object({
          type: z
            .literal("function")
            .describe(
              "The type of tool - currently only 'function' is supported",
            ),
          function: z.object({
            name: z.string().describe("The name of the function"),
            description: z
              .string()
              .describe("Description of what the function does"),
            parameters: z
              .any()
              .describe(
                "JSON Schema-like definition of the function parameters",
              ),
          }),
        }),
      )
      .optional()
      .describe("Available tools/functions that the LLM can call"),
  })
  .openapi({
    title: "AdkRequestBody",
    description:
      "HTTP request body structure for user-hosted LLM services called by TemporalLlm. " +
      "Contains conversation history, tools, model config, and session state.",
    example: {
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        {
          role: "user",
          content: "What's the weather like in San Francisco?",
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "get_current_weather",
            description: "Get current weather for a location",
            parameters: {
              type: "object",
              properties: {
                location: {
                  type: "string",
                  description: "The city and state",
                },
                unit: {
                  type: "string",
                  enum: ["celsius", "fahrenheit"],
                  description: "Temperature unit",
                },
              },
              required: ["location"],
            },
          },
        },
      ],
      state: {
        user_id: "123",
        session_id: "abc",
      },
    },
  });

// Export types for TypeScript usage
export type AdkRequestBody = z.infer<typeof AdkRequestBodySchema>;
export type AdkMessageContent = z.infer<typeof AdkMessageContentSchema>;
export type HttpToolActivityOutput = z.infer<
  typeof HttpToolActivityOutputSchema
>;
export type HttpContentPart = z.infer<typeof HttpContentPartSchema>;
