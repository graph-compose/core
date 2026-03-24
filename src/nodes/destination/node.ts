import { z } from "zod";
import { HTTPConfigSchema } from "../common";
import { BaseNodeSchema } from "../common/baseNode";

/**
 * Schema for a single cell value in a destination node.
 * This structure is consistent from UI → Server → IO-Nodes.
 */
export const DestinationCellValueSchema = z
  .object({
    /**
     * The column name/header in the destination (e.g., Google Sheets column header).
     * This is a plain string that will NOT be resolved as a template - it's the actual
     * column name to write to. If the column doesn't exist, it will be created.
     */
    columnName: z.string().openapi({
      description:
        "Column name/header for this cell value (not a template - this is the actual column name)",
      example: "processed_output",
    }),
    /**
     * The value to write to the cell. Can contain template expressions
     * like "{{ row.data.name }}" which will be resolved at runtime.
     */
    value: z.string().openapi({
      description:
        "Value to write, can contain template expressions like {{ row.data.field }}",
      example: "{{ results.process_item.data.output }}",
    }),
  })
  .openapi({
    ref: "DestinationCellValue",
    description:
      "A cell value for destination nodes with column name and templated value",
  });

export type DestinationCellValue = z.infer<typeof DestinationCellValueSchema>;

// Destination Node Schema
export const DestinationNodeSchema = BaseNodeSchema.extend({
  type: z.literal("destination").openapi({
    description:
      "Specifies the node type as `destination`. Other available types include `http`, `error_boundary`, `agent`, and `source_iterator`.",
    example: "destination",
  }),
  http: HTTPConfigSchema.extend({
    body: z.object({
      sheetId: z.string().openapi({
        description: "The ID of the destination sheet",
        example: "1abc123def456",
      }),
      cellValues: z.array(DestinationCellValueSchema).openapi({
        description: "Array of cell values to write to the destination",
        example: [
          { columnName: "name", value: "{{ row.data.name }}" },
          {
            columnName: "output",
            value: "{{ results.process_item.data.result }}",
          },
        ],
      }),
    }),
  }),
  dependencies: z.array(z.string()).openapi({
    description: "IDs of nodes that must complete before this node can execute",
    example: ["auth_token", "user_id"],
  }),
}).openapi({
  ref: "DestinationNode",
  title: "DestinationNode",
  description:
    "A workflow node that writes processed data to a destination (e.g., Google Sheets). " +
    "Each cellValue contains a columnName and a value template that gets resolved at runtime.",
  "x-tags": ["Nodes"],
});

export type DestinationNode = z.infer<typeof DestinationNodeSchema>;
