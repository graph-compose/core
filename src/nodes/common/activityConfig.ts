import { z } from "zod";
import { DurationSchema } from "./templating";

export const RetryPolicySchema = z
  .object({
    backoffCoefficient: z
      .number()
      .min(1)
      .openapi({
        description:
          "The backoff coefficient is used to calculate the next interval in the exponential backoff sequence. The next interval is calculated as the previous interval multiplied by the backoff coefficient.",
        example: 2,
      })
      .optional(),
    initialInterval: DurationSchema.optional(),
    maximumAttempts: z
      .number()
      .openapi({
        description: "The maximum number of attempts to retry the node.",
        example: 3,
      })
      .optional(),
    maximumInterval: DurationSchema.optional().openapi({
      description: "The maximum interval to wait between retries.",
      example: "10 seconds",
    }),
  })
  .partial()
  .openapi({
    ref: "RetryPolicy",
    description:
      "You can use the retry policy to configure durability on the node. Responses returned < 300 will trigger a retry up till the maximum number of attempts.",
    "x-tags": ["Configuration"],
  });

export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

export const ActivityConfigSchema = z
  .object({
    retryPolicy: RetryPolicySchema.optional().openapi({
      description:
        "Defines the strategy for retrying a failed step. Retries occur for transient failures (e.g., network issues, temporary service unavailability). The time between retries follows an exponential backoff sequence: `next_interval = initialInterval * (backoffCoefficient ^ (attempt_number - 1))`, capped by `maximumInterval`. Retries continue until `maximumAttempts` is reached.",
    }),
    startToCloseTimeout: DurationSchema.optional().openapi({
      description:
        "The maximum duration allowed for a single execution attempt of this step to complete after it has started. If an attempt exceeds this duration, it's considered failed.",
      example: "30 seconds",
    }),
    scheduleToCloseTimeout: DurationSchema.optional().openapi({
      description:
        "The maximum total duration allowed for this step from the moment it's scheduled until its final completion (or failure after all retries). This includes any queue time, execution time for all attempts, and wait time between retries.",
      example: "30 seconds",
    }),
  })
  .openapi({
    ref: "ActivityConfig",
    description:
      "Configuration for the execution behavior of a workflow step, including timeouts and retry strategies.",
  });

export type ActivityConfig = z.infer<typeof ActivityConfigSchema>;
