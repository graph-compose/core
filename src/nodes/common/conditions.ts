import { z } from "zod";
import {
  extractJsonataExpression,
  validateBooleanExpression,
  validateJsonataExpression,
  validateTemplateExpression,
} from "../../utils/templating";

// Base schema for pure JSONata expressions (like conditions)
export const JSONataExpressionSchema = z
  .string()
  .refine(validateJsonataExpression, val => ({
    message: `Invalid JSONata expression: ${val}`,
  }));

// Schema for template strings that may contain JSONata expressions
export const TemplatedExpressionSchema = z
  .string()
  .refine(validateTemplateExpression, val => ({
    message: `Invalid JSONata template expression in: ${val}`,
  }));

// Validates that a string is a single complete boolean template expression
const validateBooleanTemplateExpression = (value: string): boolean => {
  const expression = extractJsonataExpression(value);
  if (!expression) {
    return false; // Must be wrapped in {{ }}
  }
  if (!validateJsonataExpression(expression)) {
    return false; // Must be valid JSONata
  }
  return validateBooleanExpression(expression);
};

// Base schema for JSONata boolean conditions
const BooleanTemplateConditionSchema = z
  .string()
  .refine(validateBooleanTemplateExpression, val => ({
    message: `Expression must be a JSONata boolean expression wrapped in {{ }}, got: ${val}`,
  }))
  .openapi({
    description:
      "JSONata boolean expression in `{{ }}` that evaluates to true/false",
    example: "{{ status = 'completed' }}",
  });

// Defines what happens after a node completes
export const FlowControlSchema = z.object({
  to: z.string().openapi({
    description: "ID of the next node to execute",
  }),
  when: BooleanTemplateConditionSchema.openapi({
    description: "Boolean condition that must be true to take this path",
  }),
});

// The main conditions schema that can be attached to any node
export const NodeConditionsSchema = z
  .object({
    // Control flow
    continueTo: z
      .array(FlowControlSchema)
      .optional()
      .refine(
        branches => {
          if (!branches) return true;
          return branches.every(branch => {
            if (!branch.when) return true;
            return validateBooleanTemplateExpression(branch.when);
          });
        },
        val => ({
          message: `All flow control conditions must be boolean JSONata expressions wrapped in {{ }}`,
        }),
      )
      .openapi({
        description:
          "Defines conditional branching. An ordered list of potential next nodes. The workflow transitions to the `to` node ID of the *first* entry whose `when` condition evaluates to true based on the current node's results. If no condition matches, the workflow may end or follow default downstream paths.",
      }),
    terminateWhen: z.array(BooleanTemplateConditionSchema).optional().openapi({
      description:
        "Specifies conditions under which the workflow execution should halt immediately after this node completes. \nAn array of boolean [JSONata](https://jsonata.org/) expressions wrapped in `{{ }}` (e.g., `{{ status = 'error' }}`). If *any* condition evaluates to true, the entire workflow terminates.",
    }),
    // Async polling - updated to require boolean expression
    pollUntil: z.array(BooleanTemplateConditionSchema).optional().openapi({
      description:
        "Enables polling behavior. \nAn array of boolean [JSONata](https://jsonata.org/) expressions wrapped in `{{ }}` (e.g., `{{ result.jobStatus = 'COMPLETED' }}`). This node will re-execute according to its retry policy as long as *all* conditions evaluate to false. Once *all* conditions evaluate to true, the workflow proceeds.",
    }),
  })
  .openapi({
    ref: "NodeConditionsSchema",
    description:
      "Node Conditions represent conditional logic that determines the next step in a workflow. All conditions must be boolean JSONata expressions wrapped in `{{ }}`",
    "x-tags": ["Behaviors"],
  });

export type FlowControl = z.infer<typeof FlowControlSchema>;
export type NodeConditions = z.infer<typeof NodeConditionsSchema>;
