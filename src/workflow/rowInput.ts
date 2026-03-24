import { z } from "zod";

/**
 * Schema for the row input provided to iterator child workflows
 * 
 * When an iterator node spawns child workflows, each child receives information
 * about which iteration it's processing.
 * 
 * @example
 * ```typescript
 * // In a child workflow, users can access:
 * // {{ row.index }} - The 0-based index (0, 1, 2, ...)
 * // {{ row.data.columnName }} - Values from the source data item
 * 
 * {
 *   index: 0,
 *   data: {
 *     id: "item1",
 *     name: "First Item",
 *     value: 100
 *   }
 * }
 * ```
 */
export const RowInputSchema = z.object({
  /**
   * The 0-based index of this iteration
   * Use in templates as: {{ row.index }}
   * 
   * This is especially useful for Google Sheets destinations where you need
   * to calculate the row number:
   * Sheet1!A{{ $number(row.index) + 2 }}  // +2 accounts for header row and 1-based indexing
   */
  index: z.number().int().min(0).openapi({
    description: "Zero-based index of the current iteration (0, 1, 2, ...)",
    example: 0,
  }),
  
  /**
   * The data item for this iteration from the source node
   * For spreadsheet data, this represents a single row with column values
   * Use in templates as: {{ row.data.columnName }}
   */
  data: z.record(z.string(), z.any()).openapi({
    description: "The data item being processed in this iteration. For spreadsheet sources, this represents a row with column names as keys.",
    example: {
      id: "item1",
      name: "First Item", 
      value: 100,
      isActive: true
    },
  }),
}).openapi({
  ref: "RowInput",
  description: "Input provided to each iterator child workflow, containing both the iteration index and the data item being processed.",
  "x-tags": ["Workflow"],
});

export type RowInput = z.infer<typeof RowInputSchema>;

/**
 * Accumulated map of all ancestor forEach rows, keyed by forEach node ID.
 * Enables flat access to any ancestor's row regardless of nesting depth:
 *   {{ rows.forEach_depts.data.name }}
 */
export const RowsMapSchema = z.record(
  z.string(),
  RowInputSchema,
).optional().default({}).openapi({
  ref: "RowsMap",
  description: "Accumulated map of ancestor forEach rows, keyed by forEach node ID. Enables flat access to any ancestor iteration context regardless of nesting depth.",
  "x-tags": ["Workflow"],
});

export type RowsMap = z.infer<typeof RowsMapSchema>;

