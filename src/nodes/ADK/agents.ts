import { z } from "zod";
import { ActivityConfigSchema, HTTPConfigSchema } from "../common";
import { AgentTypeSchema } from "./agent-types";

/**
 * Minimal base agent configuration shared by all agent types.
 * Orchestrator agents (Sequential/Parallel/Loop) only need these fields.
 */
export const BaseAgentConfigSchema = z
  .object({
    type: AgentTypeSchema.describe(
      "The type of agent (LlmAgent, SequentialAgent, etc.)",
    ),

    id: z.string().describe("Unique identifier for this agent"),

    outputKey: z
      .string()
      .optional()
      .describe(
        `If set, the agent's final text response will be automatically saved to session_state[output_key] for access by subsequent agents.

IMPORTANT: Only the agent's final content text is stored, not intermediate tool calls, function responses, or structured data from tools. The agent's internal reasoning process (tool usage) is not propagated to other agents.

USAGE PATTERNS:
- Sequential workflows: Each agent can access previous agents' outputs via session state
- Parallel workflows: Use a synthesizer agent to combine outputs from parallel branches  
- Loop workflows: Agents can accumulate data across iterations using the same output key

NAMING BEST PRACTICES:
- Use descriptive names that clearly indicate the data type and purpose
- Examples: "user_requirements", "search_results", "booking_confirmations"
- Avoid generic names like "data", "result", or "output"

ACCESS IN SUBSEQUENT AGENTS:
Your HTTP agent service will receive the session state containing all output_key values:
{
  "state": {
    "your_output_key": "Final text response from the agent...",
    "other_agent_output": "Another agent's response...",
    "_user_message_count": 1,
    "orchestration_cycle_count": 1
  }
}`,
      ),

    instructions: z
      .string()
      .optional()
      .describe(
        "Instructions for the agent describing its role and behavior. This helps the agent understand what it should do.",
      ),
  })
  .openapi({
    ref: "BaseAgentConfig",
    title: "Base Agent Configuration",
    description: "Minimal configuration shared by all agent types",
  });

export type BaseAgentConfig = z.infer<typeof BaseAgentConfigSchema>;

/**
 * Schema for referencing sub-agents by ID.
 */
export const SubAgentReferenceSchema = z
  .object({
    agentId: z
      .string()
      .describe("The ID of an agent defined elsewhere in the workflow"),
  })
  .openapi({
    ref: "SubAgentReference",
    title: "Sub Agent Reference",
    description: "Reference to a sub-agent by ID",
  });

export type SubAgentReference = z.infer<typeof SubAgentReferenceSchema>;

/**
 * Configuration for a sequential agent (executes child agents in order).
 */
export const SequentialAgentConfigSchema = BaseAgentConfigSchema.extend({
  type: z.literal("SequentialAgent"),

  subAgents: z.array(SubAgentReferenceSchema)
    .describe(`List of sub-agent references to be executed sequentially. Order in the list defines execution order.

EXECUTION BEHAVIOR:
- Agents execute one after another in the specified order
- Each agent receives the accumulated session state from previous agents
- Each agent maintains its own isolated conversation history
- If any agent returns exit_flow=true, the sequence terminates early

DATA FLOW:
- Agent 1 executes → output saved to session_state[output_key] if configured
- Agent 2 executes → receives Agent 1's output via session state + adds its own output
- Agent 3 executes → receives both previous outputs via session state + adds its own output
- Final result contains accumulated outputs from all agents

EXAMPLE:
[
  {"agentId": "requirements_extractor"},  // Processes user input, saves to "requirements"
  {"agentId": "options_finder"},          // Uses "requirements", saves to "options"  
  {"agentId": "recommendation_engine"}    // Uses both "requirements" and "options"
]`),
}).openapi({
  ref: "SequentialAgentConfig",
  title: "Sequential Agent Configuration",
  description: "Configuration for a sequential agent",
});

export type SequentialAgentConfig = z.infer<typeof SequentialAgentConfigSchema>;

/**
 * Configuration for a parallel agent (executes child agents concurrently).
 *
 * ParallelAgents don't support outputKey since they coordinate multiple sub-agents.
 * The individual sub-agents should have their own outputKeys instead.
 *
 * Note: ParallelAgent runs natively in the workflow (not as an HTTP activity).
 */
export const ParallelAgentConfigSchema = z
  .object({
    id: z.string().describe("Unique identifier for this agent instance"),
    type: z.literal("ParallelAgent"),
    instructions: z
      .string()
      .optional()
      .describe("Instructions for the agent describing its role and behavior."),
    // Note: ParallelAgent intentionally does NOT have outputKey field
    // Individual sub-agents should have their own outputKeys instead
    subAgents: z.array(SubAgentReferenceSchema)
      .describe(`List of sub-agent references to be executed concurrently in parallel.

EXECUTION BEHAVIOR:
- All agents start execution simultaneously 
- Each agent receives the same initial session state
- Each agent maintains completely isolated conversation histories
- Agents do NOT see each other's tool calls, internal reasoning, or conversation details
- All agents must complete before parallel execution finishes
- If any agent returns exit_flow=true, the entire parallel block terminates early

MESSAGE HISTORY ISOLATION:
- FlightAgent conversation: [system_msg, user_input, flight_search_calls, agent_response]
- HotelAgent conversation: [system_msg, user_input, hotel_search_calls, agent_response]
- Each agent sees only its own tool interactions, NOT other parallel agents' activities

DATA AGGREGATION:
After parallel execution, session state contains outputs from all parallel agents:
{
  "flight_data": "Flight agent's final response...",
  "hotel_data": "Hotel agent's final response...", 
  "activity_data": "Activity agent's final response..."
}

COMMON PATTERN:
Use a synthesizer agent after parallel execution to combine all outputs into a cohesive result.`),
  })
  .openapi({
    ref: "ParallelAgentConfig",
    title: "Parallel Agent Configuration",
    description: "Configuration for a parallel agent",
  });

export type ParallelAgentConfig = z.infer<typeof ParallelAgentConfigSchema>;

/**
 * Configuration for a loop agent (repeatedly executes a child agent).
 */
export const LoopAgentConfigSchema = BaseAgentConfigSchema.extend({
  type: z.literal("LoopAgent"),

  maxAgentLoopIterations: z.number().int().positive()
    .describe(`Maximum number of times the sub-agents will be run in the loop.

OVERVIEW:
The LoopAgent executes its sub-agents sequentially in a loop until one of the following termination conditions is met:
1. max_agent_loop_iterations is reached (normal completion)
2. A sub-agent returns escalate=True (early termination)
3. An optional loop_exit_condition evaluates to True (conditional termination)

ITERATION BEHAVIOR:
- Iterations are zero-indexed: 0, 1, 2, ..., (max_agent_loop_iterations - 1)
- Each iteration executes ALL sub-agents in the sub_agents list sequentially
- The current_agent_loop_iteration counter in session state tracks the current iteration
- After max_agent_loop_iterations is reached, current_agent_loop_iteration will be set to max_agent_loop_iterations (the next iteration that would run)

TERMINATION SEMANTICS:
When max_agent_loop_iterations is reached:
- The loop completes NORMALLY (not as an error condition)
- Sets exit_flow=True with loop_exit_reason='max_agent_loop_iterations' in session state
- This is NOT treated as escalate=True - parent agents continue normally
- In nested scenarios, parent LoopAgents continue their iterations
- In sequential scenarios, the next agent in the sequence executes

NESTED LOOP BEHAVIOR:
When LoopAgents are nested (loop inside loop):
- Inner loop completion due to max_agent_loop_iterations does NOT terminate outer loop
- Each loop maintains its own iteration counter independently
- Total executions = outer_max_iterations × inner_max_iterations
- Example: Outer(max=3) containing Inner(max=2) = 6 total inner executions

SEQUENTIAL INTEGRATION:
When a LoopAgent is part of a SequentialAgent:
- Loop completion due to max_agent_loop_iterations allows sequential flow to continue
- The next agent in the sequence will execute normally
- Only escalate=True from within the loop terminates the entire sequence

PARALLEL INTEGRATION:
When LoopAgents run in parallel:
- Each loop executes independently with its own max_agent_loop_iterations
- One loop completing doesn't affect others
- All loops must complete (or escalate) before parallel execution finishes

ESCALATION VS MAX_ITERATIONS:
- escalate=True: Signals error/exception, terminates parent agents immediately
- max_agent_loop_iterations reached: Normal completion, parent agents continue
- This distinction is crucial for proper agent hierarchy behavior

STATE TRACKING:
The following state is maintained during loop execution:
- current_agent_loop_iteration: Current iteration number (0-based)
- loop_exit_reason: 'max_agent_loop_iterations', 'escalate', or 'exit_condition'
- exit_flow: Set to True when loop terminates for any reason

EXAMPLES:
Simple loop with max_agent_loop_iterations=3:
  Executions: iteration 0, 1, 2 (3 total)
  
Nested loops - Outer(max=2) containing Inner(max=3):
  Outer iteration 0: Inner runs iterations 0, 1, 2
  Outer iteration 1: Inner runs iterations 0, 1, 2
  Total: 6 inner executions across 2 outer iterations
  
Sequential with loop - [PreAgent, Loop(max=3), PostAgent]:
  PreAgent executes once
  Loop executes 3 iterations (0, 1, 2)
  PostAgent executes once (loop completion doesn't block this)

IMPORTANT NOTES:
- max_agent_loop_iterations must be >= 1
- Setting max_agent_loop_iterations=1 creates a loop that runs exactly once
- The loop will ALWAYS respect max_agent_loop_iterations even if sub-agents want to continue
- Use loop_exit_condition for dynamic termination based on state
- Use escalate=True in sub-agents for error-based early termination`),

  loopExitCondition: z
    .string()
    .optional()
    .describe(
      `A Python expression string to be evaluated against the session state. If it evaluates to True, the loop will terminate. e.g., "session_state.get('some_flag') == 'done'"`,
    ),

  subAgents: z
    .array(SubAgentReferenceSchema)
    .describe(
      `List of sub-agent references to be executed within each loop iteration. Typically, this will contain a single SequentialAgent.`,
    ),
}).openapi({
  ref: "LoopAgentConfig",
  title: "Loop Agent Configuration",
  description: "Configuration for a loop agent",
});

export type LoopAgentConfig = z.infer<typeof LoopAgentConfigSchema>;

/**
 * Configuration for an LLM agent (leaf agent that makes LLM calls).
 * Note: subAgents field will be added after AgentConfigSchema is defined to avoid circular dependency.
 */
const BaseLlmAgentConfigSchema = BaseAgentConfigSchema.extend({
  type: z.literal("LlmAgent"),

  httpConfig: HTTPConfigSchema.describe(
    `HTTP configuration for calling your LLM service via a Temporal activity.

YOUR HTTP SERVICE RECEIVES:
{
  "messages": [...],           // Agent's conversation history (isolated per agent)
  "state": {...},              // Shared session state with output_key values from other agents
  "model": "temporal-llm-model",
  "tools": [...],              // Available tools for this agent
  "stream": false
}

YOUR HTTP SERVICE RETURNS:
{
  "content": [{"type": "text", "text": "Agent response..."}],
  "tool_calls": [...],         // Optional tool calls to execute
  "exit_flow": false,          // Set to true to complete the workflow
  "hitl_request": {...}        // Optional Human-in-the-Loop request
}`,
  ),

  activityConfig: ActivityConfigSchema.optional().describe(
    "Temporal activity configuration for the HTTP call to your LLM service (timeouts, retries, etc.).",
  ),

  tools: z.array(z.string()).optional().default([])
    .describe(`List of tool IDs available to this agent. Each ID must correspond to a tool defined in the workflow's global_tools list.

TOOL TYPES:
- HttpTool: Executes external HTTP services for business logic, data retrieval, etc.
- AgentTool: Delegates to another agent, enabling specialist agent patterns

TOOL EXECUTION FLOW:
1. Agent decides to use a tool based on user input and conversation context
2. Agent returns tool_calls in its HTTP response
3. System executes the tool via Temporal activity (HttpTool) or sub-agent (AgentTool)
4. Tool results are added to the agent's conversation history
5. Agent continues processing with tool results available

EXAMPLE USAGE:
{
  "tools": ["search_flights", "book_flight", "specialist_agent_tool"],
  "global_tools": [
    {"type": "HttpTool", "id": "search_flights", "http_config": {...}},
    {"type": "HttpTool", "id": "book_flight", "http_config": {...}},
    {"type": "AgentTool", "id": "specialist_agent_tool", "target_agent_id": "specialist"}
  ]
}`),
}).openapi({
  ref: "BaseLlmAgentConfig",
  title: "Base LLM Agent Configuration",
  description: "Base configuration for an LLM agent without subAgents",
});

/**
 * Union of all possible agent configurations.
 */
export const AgentConfigSchema = z
  .discriminatedUnion("type", [
    BaseLlmAgentConfigSchema,
    SequentialAgentConfigSchema,
    ParallelAgentConfigSchema,
    LoopAgentConfigSchema,
  ])
  .openapi({
    ref: "AgentConfig",
    title: "Agent Configuration",
    description: "Union of all possible agent configurations",
  });

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

/**
 * Complete LLM agent configuration with subAgents support.
 * This is defined after AgentConfigSchema to avoid circular dependency.
 */
export const LlmAgentConfigSchema = BaseLlmAgentConfigSchema.extend({
  subAgents: z
    .array(z.lazy(() => AgentConfigSchema))
    .optional()
    .default([])
    .describe(
      `Nested sub-agent configurations for the AGENT HANDOFF patt   ern.

AGENT HANDOFF PATTERN:
This enables a parent agent to dynamically delegate control to specialized child agents based on conversation context. The parent agent uses the transfer_to_agent tool to hand off execution to a child agent, which then handles the interaction before returning control.

KEY CHARACTERISTICS:
- Child agents are FULL AgentConfig objects defined inline within the parent's subAgents array
- Parent agent "owns" these child agents - they exist within the parent's scope
- Parent uses transfer_to_agent to delegate to a specific child by ID
- Typically used for routing/delegation scenarios (e.g., router agent → specialist agents)

EXAMPLE USE CASE:
A router agent with nested greeting_agent, billing_agent, and support_agent. The router analyzes user intent and transfers control to the appropriate specialist using transfer_to_agent.

vs. ORCHESTRATOR PATTERN (Different!):
Orchestrator agents (Sequential/Parallel/Loop) use subAgents: [{ agentId: "..." }] (references only, not full configs) to coordinate agents defined at the workflow level. This is for structured multi-agent flows, not dynamic handoff.

NESTED vs. REFERENCED:
- Nested (this field): Full agent configs inline → createLlmAgent({ subAgents: [createLlmAgent(...)] })
- Referenced (orchestrators): Agent ID references → createSequentialAgent({ subAgents: [{ agentId: "agent1" }] })`,
    ),
}).openapi({
  ref: "LlmAgentConfig",
  title: "LLM Agent Configuration",
  description: "Configuration for an LLM agent",
});

export type LlmAgentConfig = z.infer<typeof LlmAgentConfigSchema>;
