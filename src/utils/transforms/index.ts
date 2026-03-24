import { PendingToolCall } from "../../nodes/ADK/contracts";

/**
 * Converts OpenAI Responses API function_call output items to ADK PendingToolCall[]
 * @param openAIToolCalls Array of function_call output items from OpenAI Responses API
 * @returns PendingToolCall[] for ADK/Temporal
 */
export function openAIToAdkToolCalls(
  openAIToolCalls: any[],
): PendingToolCall[] {
  if (!Array.isArray(openAIToolCalls)) return [];
  console.log("🔍 [DEBUG] openAIToolCalls", openAIToolCalls);

  const pendingToolCalls = openAIToolCalls
    .filter(tc => tc.type === "function_call")
    .map(tc => ({
      id: tc.id,
      call_id: tc.call_id,
      function_name: tc.name,
      function_args:
        typeof tc.arguments === "string"
          ? JSON.parse(tc.arguments)
          : tc.arguments,
    }));

  console.log("🔍 [DEBUG] pendingToolCalls", pendingToolCalls);

  return pendingToolCalls;
}

/**
 * Converts ADK messages to OpenAI Responses API input format.
 * For the Responses API, we need simple messages with role and string content,
 * plus separate function_call and function_call_output items.
 * @param adkMessages Array of ADK messages
 * @returns Array of OpenAI Responses API input items
 */
export function adkMessagesToOpenAIMessages(adkMessages: any[]): any[] {
  const openAIMessages: any[] = [];

  for (const message of adkMessages) {
    const { role, content } = message;

    // Handle system and regular user/assistant messages with text content
    if (typeof content === "string") {
      openAIMessages.push({
        role,
        content, // Simple string content for Responses API
      });
      continue;
    }

    // Handle array content (function calls, tool results, etc)
    if (Array.isArray(content)) {
      let textContent = "";

      for (const item of content) {
        // Function/tool call - add as separate function_call item
        if (item.type === "function_call") {
          openAIMessages.push({
            type: "function_call",
            id: item.id,
            call_id: item.call_id,
            name: item.name,
            arguments:
              typeof item.args === "string"
                ? item.args
                : JSON.stringify(item.args ?? {}),
          });
          continue;
        }

        // Tool result (function_response) - add as separate function_call_output item
        if (item.type === "function_response") {
          openAIMessages.push({
            type: "function_call_output",
            call_id: item.call_id,
            output:
              typeof item.response === "string"
                ? item.response
                : JSON.stringify(item.response),
          });
          continue;
        }

        // Text content - collect all text parts
        if (item.type === "text" && item.text) {
          textContent += (textContent ? "\n" : "") + item.text;
        }
      }

      // If we have text content, add it as a regular message
      if (textContent.trim()) {
        openAIMessages.push({
          role,
          content: textContent,
        });
      }
      continue;
    }

    // Fallback for any other message format
    openAIMessages.push(message);
  }

  return openAIMessages;
}

/**
 * Converts a tool result from ADK/Temporal to a function_call_output input item for OpenAI Responses API
 * @param callId The call_id of the function/tool call (from OpenAI)
 * @param result The result/output of the tool execution
 * @returns function_call_output input item
 */
export function adkToolResultToFunctionCallOutput(callId: string, result: any) {
  return {
    type: "function_call_output",
    call_id: callId,
    output: typeof result === "string" ? result : JSON.stringify(result),
  };
}
