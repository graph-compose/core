import { z } from "zod";
import { NodeSchema } from "../nodes";
import { AdkNode } from "../nodes/ADK/node"; // Import ADK node type
import { DurationSchema } from "../nodes/common";

export const WorkflowConfigSchema = z.object({
  workflowExecutionTimeout: DurationSchema.optional().openapi({
    description: "The maximum time a workflow can run before timing out",
    example: "30 seconds",
  }),
});

export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>;

/**
 * Validates ADK-specific workflow configurations and agent hierarchies.
 */
function validateAdkNodes(
  adkNodes: AdkNode[],
  ctx: z.RefinementCtx,
  data: any,
) {
  for (const adkNode of adkNodes) {
    const workflow = adkNode.config;

    // Build set of available tools from this ADK's globalTools array
    const adkAvailableTools = new Set(
      workflow.globalTools?.map(tool => tool.id) || [],
    );

    // Check that ADK agents reference valid global tools from their own ADK workflow
    if (workflow.agents && Array.isArray(workflow.agents)) {
      for (const agent of workflow.agents) {
        // Only LlmAgent has tools property
        if (
          agent.type === "LlmAgent" &&
          agent.tools &&
          Array.isArray(agent.tools)
        ) {
          for (const toolId of agent.tools) {
            if (!adkAvailableTools.has(toolId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `ADK node '${adkNode.id}' agent '${agent.id}' references undefined tool '${toolId}'. ADK agents can only use tools from their workflow's globalTools array.`,
                path: ["nodes", adkNode.id, "config", "agents"],
              });
            }
          }
        }
      }
    }

    // Validate that rootAgentId agent exists
    if (
      workflow.rootAgentId &&
      workflow.agents &&
      Array.isArray(workflow.agents)
    ) {
      const entryAgent = workflow.agents.find(
        (a: any) => a.id === workflow.rootAgentId,
      );
      if (!entryAgent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `ADK node '${adkNode.id}' has rootAgentId '${workflow.rootAgentId}' but no agent with that ID exists.`,
          path: ["nodes", adkNode.id, "config", "rootAgentId"],
        });
      }
    }

    // Validate that agent references in SequentialAgent, ParallelAgent, and LoopAgent exist
    if (workflow.agents && Array.isArray(workflow.agents)) {
      for (const agent of workflow.agents) {
        if (
          agent.type === "SequentialAgent" ||
          agent.type === "ParallelAgent" ||
          agent.type === "LoopAgent"
        ) {
          if (
            "subAgents" in agent &&
            agent.subAgents &&
            Array.isArray(agent.subAgents)
          ) {
            for (const subAgentRef of agent.subAgents) {
              const childAgentId = subAgentRef.agentId;
              if (!workflow.agents.find((a: any) => a.id === childAgentId)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `ADK node '${adkNode.id}' agent '${agent.id}' references undefined child agent '${childAgentId}'.`,
                  path: ["nodes", adkNode.id, "config", "agents"],
                });
              }
            }
          }
        }
      }
    }

    // Validate ADK global tools reference valid workflow tools
    if (workflow.globalTools && Array.isArray(workflow.globalTools)) {
      for (const globalTool of workflow.globalTools) {
        if (globalTool.type === "AgentTool") {
          // Check that AgentTool references a valid agent within the workflow
          if (
            "targetAgentId" in globalTool &&
            globalTool.targetAgentId &&
            workflow.agents
          ) {
            const referencedAgent = workflow.agents.find(
              (a: any) => a.id === globalTool.targetAgentId,
            );
            if (!referencedAgent) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `ADK node '${adkNode.id}' AgentTool '${globalTool.id}' references undefined agent '${globalTool.targetAgentId}'.`,
                path: ["nodes", adkNode.id, "config", "globalTools"],
              });
            }
          }
        }
      }
    }

    // Validate agent IDs are unique within the workflow
    if (workflow.agents && Array.isArray(workflow.agents)) {
      const agentIds = new Set();
      for (const agent of workflow.agents) {
        if (agentIds.has(agent.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `ADK node '${adkNode.id}' has duplicate agent ID '${agent.id}'. Agent IDs must be unique within a workflow.`,
            path: ["nodes", adkNode.id, "config", "agents"],
          });
        }
        agentIds.add(agent.id);
      }
    }

    // Validate global tool IDs are unique within the workflow
    if (workflow.globalTools && Array.isArray(workflow.globalTools)) {
      const toolIds = new Set();
      for (const tool of workflow.globalTools) {
        if (toolIds.has(tool.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `ADK node '${adkNode.id}' has duplicate global tool ID '${tool.id}'. Global tool IDs must be unique within a workflow.`,
            path: ["nodes", adkNode.id, "config", "globalTools"],
          });
        }
        toolIds.add(tool.id);
      }
    }

    // Validate circular references don't exist in agent hierarchies
    if (workflow.agents && Array.isArray(workflow.agents)) {
      const detectCircularDependencies = (
        agentId: string,
        visited: Set<string>,
        path: Set<string>,
      ): boolean => {
        if (path.has(agentId)) return true; // Circular dependency found
        if (visited.has(agentId)) return false; // Already processed

        visited.add(agentId);
        path.add(agentId);

        const agent = workflow.agents.find((a: any) => a.id === agentId);
        if (!agent) return false;

        // Check child agents for Sequential, Parallel, and Loop agents
        if (
          (agent.type === "SequentialAgent" ||
            agent.type === "ParallelAgent" ||
            agent.type === "LoopAgent") &&
          "subAgents" in agent &&
          agent.subAgents
        ) {
          for (const subAgentRef of agent.subAgents) {
            const childId = subAgentRef.agentId;
            if (detectCircularDependencies(childId, visited, path)) {
              return true;
            }
          }
        }

        path.delete(agentId);
        return false;
      };

      const visited = new Set<string>();
      for (const agent of workflow.agents) {
        if (!visited.has(agent.id)) {
          if (detectCircularDependencies(agent.id, visited, new Set())) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `ADK node '${adkNode.id}' contains circular dependencies in agent hierarchy involving agent '${agent.id}'.`,
              path: ["nodes", adkNode.id, "config", "agents"],
            });
            break; // One circular dependency error is enough
          }
        }
      }
    }

    // Validate maxOrchestrationCycles is reasonable
    if (workflow.maxOrchestrationCycles !== undefined) {
      if (workflow.maxOrchestrationCycles < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `ADK node '${adkNode.id}' has maxOrchestrationCycles of ${workflow.maxOrchestrationCycles}, which must be at least 1.`,
          path: ["nodes", adkNode.id, "config", "maxOrchestrationCycles"],
        });
      }

      // Warn if maxOrchestrationCycles seems too high (potential runaway)
      if (workflow.maxOrchestrationCycles > 1000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `ADK node '${adkNode.id}' has maxOrchestrationCycles of ${workflow.maxOrchestrationCycles}, which seems very high and could lead to runaway execution. Consider a lower value.`,
          path: ["nodes", adkNode.id, "config", "maxOrchestrationCycles"],
        });
      }
    }
  }
}

export const WorkflowGraphSchema = z
  .object({
    nodes: z.array(NodeSchema).openapi({
      description: "The nodes in the workflow",
    }),
    webhookUrl: z.string().url().optional().openapi({
      description: "Optional webhook URL to notify when the workflow completes",
    }),
    context: z.record(z.any()).optional().openapi({
      description:
        "An optional object providing initial data to the workflow execution. This data is globally accessible throughout the workflow using handlebars expressions prefixed with `context.`, like `{{ context.apiKey }}`. You can leverage the full power of the [JSONata](https://jsonata.org/) query and transformation language within these expressions when accessing context data.\n\nUse this for static configuration or any data needed by multiple nodes at the start of the workflow. For sensitive values like API keys, it is recommended to use Graph Compose's dedicated secrets management features rather than including them directly in the context.",
    }),
    workflowConfig: WorkflowConfigSchema.optional().openapi({
      description: "Configuration for the workflow",
    }),
    meta: z.record(z.any()).optional().openapi({
      description:
        "Any additional information about the workflow. This pretty much doesn't do anything",
    }),
  })
  .superRefine((data, ctx) => {
    // Get all agent nodes that have tools configured

    // Get all ADK nodes
    const adkNodes = data.nodes.filter(
      (node): node is AdkNode => node.type === "adk",
    );

    // Validate ADK nodes using the separate function
    validateAdkNodes(adkNodes, ctx, data);
  })
  .openapi({
    ref: "WorkflowGraph",
    description:
      "A workflow graph is a collection of nodes that are connected to each other. It is the main object that defines the structure of a workflow.",
    "x-tags": ["Workflow"],
  });

export type WorkflowGraph = z.infer<typeof WorkflowGraphSchema>;
