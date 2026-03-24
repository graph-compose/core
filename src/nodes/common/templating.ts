import ms from "ms";
import { z } from "zod";
import { validateTemplateExpression } from "../../utils/templating";

// Schema for strings that must contain JSONata expressions
export const TemplatedStringSchema = z
  .string()
  .regex(/.*\{\{.*\}\}.*/, {
    message: "String must contain a JSONata expression wrapped in {{ }}",
  })
  .refine(validateTemplateExpression, val => ({
    message: `Invalid JSONata template expression in: ${val}`,
  }));

// Updated to require template expressions in strings
export const JsonataObjectSchema = z.union([
  z.record(z.string(), z.any()),
  TemplatedStringSchema,
]);

export type JsonataObject = z.infer<typeof JsonataObjectSchema>;

export const JsonataExpressionSchema = z.string().regex(/^\{\{(.*)\}\}$/, {
  message:
    "Expression must be wrapped in double curly braces (e.g. '{{your.expression}}')",
});

export type JsonataExpression = z.infer<typeof JsonataExpressionSchema>;

export const JsonataParamSchema = z.record(z.string(), JsonataExpressionSchema);

export type JsonataParam = z.infer<typeof JsonataParamSchema>;

// Regex to validate duration strings like "1s", "5 minutes", "2.5hrs"
// This is kept for basic string format check before passing to ms()
export const durationRegex =
  /^(\d*\.?\d+)\s*(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)$/i;

// Helper to convert a pre-validated duration string to milliseconds
// It assumes the input string format is already validated by DurationSchema
function durationStringToMs(duration: string): number | null {
  try {
    // Use ms() which is robust. We expect it to succeed here.
    // @ts-ignore
    const valueMs = ms(duration);
    if (typeof valueMs !== "number" || valueMs < 0) {
      // Should ideally not happen if schema validation works
      return null;
    }
    return valueMs;
  } catch (error) {
    // Should not happen if the schema validation catches format errors
    console.error(
      `Error parsing already validated duration string: ${duration}`,
      error,
    );
    return null;
  }
}

// Base schema for duration string, validates format using 'ms' logic
export const DurationSchema = z
  .string()
  .refine(
    (value): value is string => {
      try {
        // @ts-ignore
        const result = ms(value);
        // Ensure ms() returned a non-negative number
        return typeof result === "number" && result >= 0;
      } catch {
        return false; // ms() throws on invalid format
      }
    },
    {
      message:
        "Invalid duration format. Must be a string parseable by 'ms' (e.g., '30s', '5m', '1h').",
    },
  )
  .openapi({
    description:
      "Duration as a string parseable by the 'ms' library (e.g., '30 seconds', '5 minutes', '1 day')",
    example: "5 minutes",
  });

export type Duration = z.infer<typeof DurationSchema>; // Will now be just `string`

interface DurationBounds {
  min?: string; // e.g., "1s"
  max?: string; // e.g., "1h"
}

/**
 * Factory function to create a Zod schema for duration string with optional min/max bounds.
 */
export function createBoundedDurationSchema({
  min,
  max,
}: DurationBounds = {}): z.ZodEffects<
  typeof DurationSchema,
  Duration,
  Duration
> {
  // Pre-parse and validate bounds during schema creation
  const minMs = min ? durationStringToMs(min) : null;
  const maxMs = max ? durationStringToMs(max) : null;

  if (min && minMs === null) {
    throw new Error(`Invalid minimum duration format: ${min}`);
  }
  if (max && maxMs === null) {
    throw new Error(`Invalid maximum duration format: ${max}`);
  }
  if (minMs !== null && maxMs !== null && minMs > maxMs) {
    throw new Error(
      `Minimum duration (${min}) cannot be greater than maximum duration (${max})`,
    );
  }

  // Refine the base string schema which already guarantees valid format
  return DurationSchema.refine(
    value => {
      const valueMs = durationStringToMs(value);
      // Format is already valid due to base schema, just check bounds
      if (valueMs === null) return false; // Should not happen, defensive check

      if (minMs !== null && valueMs < minMs) return false;
      if (maxMs !== null && valueMs > maxMs) return false;

      return true;
    },
    value => {
      // Constructing the error message based on which bound was violated
      const valueMs = durationStringToMs(value);
      let message = "Duration is out of bounds."; // Default/fallback
      if (minMs !== null && valueMs !== null && valueMs < minMs) {
        message = `Duration must be at least ${min}.`;
      }
      if (maxMs !== null && valueMs !== null && valueMs > maxMs) {
        message = `Duration must be no more than ${max}.`;
      }
      return { message };
    },
  ).openapi({
    // Update OpenAPI description for the bounded schema
    description:
      `Duration as a string. ${min ? `Min: ${min}.` : ""} ${max ? `Max: ${max}.` : ""}`.trim(),
    example: min ?? max ?? "30s",
  });
}
