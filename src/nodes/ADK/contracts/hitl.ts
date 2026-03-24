import { z } from "zod";

/**
 * Details for a Human-in-the-Loop confirmation request.
 */
export const HitlRequestSchema = z
  .object({
    prompt: z
      .string()
      .describe(
        "The human-readable prompt/question to present to the user for confirmation.",
      ),

    actionDetails: z
      .record(z.any())
      .optional()
      .describe(
        "Additional structured details about the action requiring confirmation.",
      ),
  })
  .openapi({
    ref: "HitlRequest",
    title: "HITL Confirmation Request",
    description: "Details for a Human-in-the-Loop confirmation request",
    examples: [
      {
        prompt: "Should I book this flight to SFO for $300?",
        actionDetails: {
          flight_id: "FL123",
          destination: "SFO",
          price: 300,
          booking_reference: "ABC123",
        },
      },
    ],
  });

export type HitlRequest = z.infer<typeof HitlRequestSchema>;
