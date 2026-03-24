import { z } from "zod";

/**
 * Schema for source node metadata
 */
export const SourceNodeMetadataSchema = z
  .object({
    /**
     * Total number of items in the collection (optional)
     */
    total: z.number().optional().openapi({
      description: "Total number of items in the collection",
      example: 42,
    }),
  })
  .openapi({
    ref: "SourceNodeMetadata",
    description: "Optional metadata for a source node result",
  });

/**
 * Schema for source node results returned by data source nodes
 * This provides a standardized format for iterator nodes
 */
export const SourceNodeResultSchema = z
  .object({
    /**
     * Array of items to be iterated over
     * For tabular data (like spreadsheets), each item represents a row with:
     * - Each column accessible as a property (e.g. item.columnName)
     * - Column values can be any type (string, number, boolean, object, etc.)
     */
    items: z.array(z.record(z.string(), z.any())).openapi({
      description:
        "Array of records to iterate over, typically representing rows in tabular data",
      example: [
        {
          id: "row1",
          name: "John Doe",
          email: "john@example.com",
          age: 30,
          isActive: true,
        },
        {
          id: "row2",
          name: "Jane Smith",
          email: "jane@example.com",
          age: 28,
          isActive: false,
        },
      ],
    }),

    /**
     * Optional metadata about the items collection
     */
    metadata: SourceNodeMetadataSchema.optional().openapi({
      description: "Optional metadata about the items collection",
    }),
  })
  .openapi({
    ref: "SourceNodeResult",
    description:
      "Standard response format for data sources used with iterator nodes",
  });

export type SourceNodeMetadata = z.infer<typeof SourceNodeMetadataSchema>;
export type SourceNodeResult = z.infer<typeof SourceNodeResultSchema>;
