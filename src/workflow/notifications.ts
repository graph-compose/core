import { z } from "zod";

export const nodeWebhookPayloadSchema = z
  .object({
    timestamp: z.number().openapi({
      description: "Unix timestamp (milliseconds) when the event occurred.",
    }),
    nodeId: z.string().openapi({
      description: "The ID of the node this notification relates to.",
    }),
    nodeType: z.string().openapi({
      description: "The type of the node (e.g., 'http', 'agent').",
    }),
    executionState: z
      .enum([
        "pending",
        "executed",
        "terminated",
        "executed_and_failed",
        "skipped",
      ])
      .openapi({
        description: "The state of the node at the time of the notification.",
      }),
    result: z
      .unknown()
      .optional()
      .openapi({ description: "The result output of the node, if available." }),
    error: z
      .object({
        message: z.string().openapi({ description: "The error message." }),
        type: z
          .string()
          .optional()
          .openapi({ description: "The type or category of the error." }),
        details: z
          .unknown()
          .optional()
          .openapi({ description: "Additional details about the error." }),
      })
      .optional()
      .openapi({ description: "Error details, if the node failed." }),
  })
  .openapi({
    title: "Node Webhook Payload",
    description: "Payload sent for node-specific webhook events.",
  });

export const completionWebhookPayloadSchema = z
  .object({
    timestamp: z.number().openapi({
      description: "Unix timestamp (milliseconds) when the workflow completed.",
    }),
    result: z.unknown().optional().openapi({
      description: "The final result of the entire workflow, if successful.",
    }),
    error: z
      .unknown()
      .optional()
      .openapi({ description: "Details of the error if the workflow failed." }),
  })
  .openapi({
    title: "Completion Webhook Payload",
    description:
      "Payload sent when the entire workflow completes (successfully or with failure).",
  });

export const WebhookPayloadSchema = z
  .object({
    workflowId: z
      .string()
      .openapi({ description: "The unique ID of the workflow definition." }),
    runId: z.string().openapi({
      description: "The unique ID for this specific execution run.",
    }),
    data: z
      .union([nodeWebhookPayloadSchema, completionWebhookPayloadSchema])
      .openapi({
        description:
          "The specific payload, either for a node event or workflow completion.",
      }),
    type: z.enum(["node", "completion"]).openapi({
      description:
        "Indicates whether the payload is for a 'node' event or workflow 'completion'.",
    }),
  })
  .openapi({
    title: "Webhook Payload",
    description:
      "The overall structure of the payload sent to configured webhooks.",
    "x-tags": ["Webhooks"],
  });

export type NodeWebhookPayload = z.infer<typeof nodeWebhookPayloadSchema>;
export type CompletionWebhookPayload = z.infer<
  typeof completionWebhookPayloadSchema
>;

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
