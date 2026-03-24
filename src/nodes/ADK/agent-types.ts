import { z } from "zod";

/**
 * Enum representing the different types of agents supported in the ADK temporal integration.
 */
export const AgentTypeSchema = z
  .enum(["LlmAgent", "SequentialAgent", "ParallelAgent", "LoopAgent"])
  .openapi({
    ref: "AgentType",
    title: "Agent Type",
    description:
      "Different types of agents supported in the ADK temporal integration",
  });

export type AgentType = z.infer<typeof AgentTypeSchema>;
