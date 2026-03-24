import { z } from "zod";
import { BaseNodeSchema } from "../common/baseNode";
import { RetryPolicySchema } from "../common/activityConfig";
import { DurationSchema } from "../common/templating";

export const ChildWorkflowConfigSchema = z.object({
  workflowExecutionTimeout: DurationSchema.optional().openapi({
    description:
      "Maximum total time for each child workflow. If a child exceeds this, it is terminated. Falls back to the parent workflow's workflowExecutionTimeout when not set.",
    example: "5 minutes",
  }),
  retry: RetryPolicySchema.optional().openapi({
    description:
      "Retry policy for child workflows. Controls workflow-level retries (distinct from activity-level retries configured via activityConfig on individual nodes).",
  }),
}).openapi({
  ref: "ChildWorkflowConfig",
  description:
    "Configuration for child workflows spawned by forEach or source_iterator nodes. Controls per-child timeouts and retry behavior at the workflow level.",
  "x-tags": ["Configuration"],
});

export type ChildWorkflowConfig = z.infer<typeof ChildWorkflowConfigSchema>;

export const ForEachNodeSchema = BaseNodeSchema.omit({ activityConfig: true }).extend({
  type: z.literal("forEach").openapi({
    description:
      "Specifies the node type as \\`forEach\\`. Iterates over an array and spawns a child workflow for each item.",
    example: "forEach",
  }),
  forEach: z.object({
    items: z.string().openapi({
      description:
        "A JSONata expression pointing to an array in workflow results. " +
        "Each element in the array becomes `row.data` in a spawned child workflow. " +
        "For example, `{{ results.fetch_users.data.users }}` iterates over the `users` array " +
        "returned by the `fetch_users` node, spawning one child workflow per user.\n\n" +
        "The expression must be wrapped in `{{ }}` and must evaluate to an array. " +
        "If the expression is not in `{{ }}` format, the node fails with a format error. " +
        "If it evaluates to a non-array value (string, number, object, null), the node fails with a type error. " +
        "If it evaluates to an empty array `[]`, no child workflows are spawned and the forEach completes immediately " +
        "with `totalItems: 0` and an empty `items[]` in its result. " +
        "If the referenced node or field doesn't exist (e.g., a typo like `results.fetch_uers.data.users`), " +
        "the expression evaluates to `undefined` and the node fails — unless the forEach's parent node " +
        "has `strict: true`, in which case the error is caught earlier with a detailed resolution report.",
      example: "{{ results.fetch_users.data.users }}",
    }),
  }),
  config: z.object({
    continueOnError: z.boolean().optional().openapi({
      description:
        "When true, the forEach node succeeds with partial failures instead of failing entirely. " +
        "Failed children are tracked in `failedItems` and the result uses statusCode 207 (multi-status).",
      example: true,
    }),
    maxFailures: z.number().int().min(1).optional().openapi({
      description:
        "Maximum number of child failures allowed before the forEach itself fails. " +
        "Only meaningful when `continueOnError` is true. When exceeded, remaining children are cancelled.",
      example: 5,
    }),
    concurrency: z.number().int().min(1).optional().openapi({
      description:
        "Maximum number of child workflows running simultaneously. " +
        "When not set, all items are processed in parallel. Set to 1 for sequential processing.",
      example: 10,
    }),
    childWorkflowConfig: ChildWorkflowConfigSchema.optional().openapi({
      description:
        "Timeout and retry configuration for child workflows spawned by this forEach. " +
        "When not set, children inherit the parent workflow's timeout.",
    }),
  }).optional().openapi({
    description: "Execution configuration for this forEach node's child workflows.",
  }),
  dependencies: z.array(z.string()).openapi({
    description:
      "Array of node IDs that must execute before this forEach node. " +
      "At least one dependency is required in a root workflow so the items expression has data to evaluate against. " +
      "In child workflows (spawned by a parent forEach), this may be empty when the forEach is the entry point of the subgraph — " +
      "its items expression can reference propagated parent results or the outer row via rows.<forEachId>.data.",
  }),
}).openapi({
  ref: "ForEachNode",
  title: "ForEachNode",
  description:
    "Iterates over an array from a JSONata expression and spawns a child workflow for each element. " +
    "Each child workflow receives the current element as `row.data` and its index as `row.index`.\n\n" +
    "Nodes between the forEach and its matching `endForEach` run inside each child workflow (once per item). " +
    "Nodes downstream of the `endForEach` run in the parent workflow after all children complete, " +
    "with access to aggregated results in `{{ results.<forEachId>.data.items }}`.\n\n" +
    "Child workflow access:\n" +
    "- `{{ row.index }}` — zero-based iteration index\n" +
    "- `{{ row.data }}` — the current array element\n" +
    "- `{{ row.data.<property> }}` — nested properties on the element",
  "x-tags": ["Nodes"],
});

export type ForEachNode = z.infer<typeof ForEachNodeSchema>;

export const EndForEachNodeSchema = BaseNodeSchema.omit({ activityConfig: true }).extend({
  type: z.literal("endForEach").openapi({
    description: "Marks the end of a forEach loop body. Does not execute any logic itself.",
    example: "endForEach",
  }),
  forEachId: z.string().openapi({
    description:
      "The ID of the forEach node this endForEach closes. " +
      "All nodes between the forEach and this endForEach run inside child workflows. " +
      "Nodes downstream of this endForEach run in the parent workflow after all children complete.",
    example: "for_each_users",
  }),
  dependencies: z.array(z.string()).min(1).openapi({
    description:
      "Must depend on the last node(s) inside the forEach loop. " +
      "This tells the graph where the loop ends.",
  }),
}).openapi({
  ref: "EndForEachNode",
  title: "EndForEachNode",
  description:
    "Structural boundary node that marks the end of a forEach loop. " +
    "All nodes between the forEach and endForEach run inside child workflows (once per item). " +
    "Nodes downstream of the endForEach execute in the parent workflow after all children complete, " +
    "with access to aggregated results via `{{ results.<forEachId>.data.items }}`.\n\n" +
    "This node does not execute any logic — it is automatically completed when the forEach finishes.",
  "x-tags": ["Nodes"],
});

export type EndForEachNode = z.infer<typeof EndForEachNodeSchema>;
