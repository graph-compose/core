import { z } from "zod";
import { ActivityConfigSchema, HTTPConfigSchema } from "../common";

/**
 * Defines a global tool executed via an HTTP call (TemporalActivityTool).
 */
export const GlobalHttpToolDefinitionSchema = z
  .object({
    type: z
      .literal("HttpTool")
      .default("HttpTool")
      .describe("Discriminator for HTTP-based tools."),

    id: z.string().describe("Unique ID of the tool."),

    httpConfig: HTTPConfigSchema.describe(
      `HTTP configuration for executing this tool via a Temporal activity.

TOOL EXECUTION FLOW:
1. Agent decides to call this tool and includes it in tool_calls response
2. System extracts tool arguments and makes HTTP request to your service
3. Your service processes the request and returns the result
4. Result is added to the agent's conversation history as a function_response
5. Agent continues processing with the tool result available

YOUR HTTP SERVICE RECEIVES:
{
  "tool_name": "your_tool_id",
  "arguments": {...},          // Tool arguments from the agent's tool_call
  "session_state": {...},      // Current workflow session state
  "context": {...}             // Additional context if needed
}

YOUR HTTP SERVICE RETURNS:
{
  "output": {...},             // The result data to be returned to the agent
  "status": "success|error",   // Status indicator
  "message": "..."             // Optional status message
}

The agent will receive this as a function_response and can use the output in its reasoning.`,
    ),

    activityConfig: ActivityConfigSchema.optional().describe(
      "Temporal activity configuration for this HTTP call.",
    ),

    outputKey: z
      .string()
      .optional()
      .describe(
        `If set, the tool's entire response will be automatically saved to session_state[output_key] for access by subsequent agents or tools.

IMPORTANT: The complete tool response will be stored, allowing agents to access the full tool result including status, error information, and output data.

USAGE PATTERNS:
- Chain tool outputs: One tool's result becomes input for subsequent agent reasoning
- Aggregate data: Multiple tools can contribute to a shared data structure  
- Cross-agent communication: Tools can store data for other agents to use
- Debug information: Full response includes status and error details

NAMING BEST PRACTICES:
- Use descriptive names: "search_results", "booking_confirmation", "user_profile"
- Avoid conflicts with agent output_keys or system keys like "_user_message_count"
- Last writer wins: If multiple tools use the same output_key, the last executed tool's response overwrites previous values

YOUR HTTP SERVICE RESPONSE (FULL RESPONSE SAVED):
{
  "output": {"key": "value"},
  "status": "success", 
  "message": "Task completed"
}
// Complete object above gets stored in session_state[output_key]

AGENT ACCESS:
Subsequent agents will see this in their session state context:
{
  "state": {
    "your_tool_output_key": {
      "output": {"key": "value"},
      "status": "success",
      "message": "Task completed"
    },
    "other_data": "..."
  }
}`,
      ),
  })
  .openapi({
    ref: "GlobalHttpToolDefinition",
    title: "Global HTTP Tool Definition",
    description: "Defines a global tool executed via an HTTP call",
  });

export type GlobalHttpToolDefinition = z.infer<
  typeof GlobalHttpToolDefinitionSchema
>;

/**
 * Defines a global tool that executes another agent (AgentTool).
 */
export const GlobalAgentToolDefinitionSchema = z
  .object({
    type: z
      .literal("AgentTool")
      .describe("Discriminator for Agent-based tools."),

    id: z.string().describe("Unique id of the tool, for the LLM to reference."),

    targetAgentId: z.string().describe(
      `The ID of the agent (from the main 'agents' list) that this tool will execute when called.

AGENT TOOL EXECUTION FLOW:
1. Parent agent decides to delegate work to a specialist agent
2. Parent agent calls this AgentTool in its tool_calls response  
3. System executes the target agent with the provided arguments
4. Target agent runs its complete lifecycle (LLM calls, tool usage, etc.)
5. Target agent's final text response is returned to parent agent as function_response
6. Parent agent continues with the specialist's output available

DELEGATION PATTERNS:
- Specialist Agents: "Call the calendar_agent to find available meeting times"
- Validation Agents: "Call the data_validator to verify this information"
- Processing Agents: "Call the document_processor to analyze this file"

EXAMPLE USAGE:
Parent agent receives: "I need to book a flight to Tokyo"
Parent agent calls: {"name": "flight_specialist_tool", "arguments": {"destination": "Tokyo", "task": "find flights"}}
Flight specialist executes: Searches flights, compares options, formats results
Parent agent receives: "Found 3 flights to Tokyo: [detailed flight info]"
Parent agent continues: "Based on the flight options, I recommend..."

The target agent maintains its own conversation history separate from the calling agent.`,
    ),

    skipSummarization: z
      .boolean()
      .optional()
      .default(false)
      .describe("Corresponds to AgentTool's skip_summarization parameter."),

    activityConfig: ActivityConfigSchema.optional().describe(
      "Temporal activity configuration for this agent execution.",
    ),

    outputKey: z
      .string()
      .optional()
      .describe(
        `If set, the agent tool's final text response will be automatically saved to session_state[output_key] for access by subsequent agents or tools.

IMPORTANT: The target agent's final content text is stored, allowing other agents to access specialist agent outputs.

USAGE PATTERNS:
- Specialist results: Save the output of specialist agents for coordinator agents to use
- Cross-agent communication: Agent tools can store outputs for other agents to reference
- Delegation patterns: Parent agents can accumulate results from multiple specialist agents

NAMING BEST PRACTICES:
- Use descriptive names: "analysis_results", "validation_report", "specialist_findings"
- Avoid conflicts with HTTP tool output_keys or system keys like "_user_message_count"
- Last writer wins: If multiple agent tools use the same output_key, the last executed tool's response overwrites previous values

AGENT TOOL EXECUTION:
{
  "target_agent_response": "Specialist agent completed analysis with findings...",
  // Complete target agent's final text response gets stored in session_state[output_key]
}

ACCESS IN SUBSEQUENT AGENTS:
Subsequent agents will see this in their session state context:
{
  "state": {
    "your_agent_tool_output_key": "Specialist agent completed analysis with findings...",
    "other_data": "..."
  }
}`,
      ),
  })
  .openapi({
    ref: "GlobalAgentToolDefinition",
    title: "Global Agent Tool Definition",
    description: "Defines a global tool that executes another agent",
  });

export type GlobalAgentToolDefinition = z.infer<
  typeof GlobalAgentToolDefinitionSchema
>;

/**
 * Union of all possible global tool definitions.
 */
export const GlobalToolDefinitionSchema = z
  .discriminatedUnion("type", [
    GlobalHttpToolDefinitionSchema,
    GlobalAgentToolDefinitionSchema,
  ])
  .openapi({
    ref: "GlobalToolDefinition",
    title: "Global Tool Definition",
    description: "Union of all possible global tool definitions",
  });

export type GlobalToolDefinition = z.infer<typeof GlobalToolDefinitionSchema>;
