import { z } from "zod";
import { HTTPConfigSchema } from "../common";
import { BaseNodeSchema } from "../common/baseNode";

// Iterator Node Schema
export const IteratorNodeSchema = BaseNodeSchema.extend({
  type: z.literal("source_iterator").openapi({
    description:
      "Specifies the node type as \\`source_iterator\\`. Other available types include \\`http\\`, \\`error_boundary\\`, \\`agent\\`, and \\`destination\\`.",
    example: "source_iterator",
  }),
  http: HTTPConfigSchema,
  dependencies: z.array(z.string()).max(0),
}).openapi({
  ref: "IteratorNode",
  title: "IteratorNode",
  description:
    "A workflow construct that spawns child workflows for each item from a source node. Each child workflow has access to:\n\n" +
    "- `{{ row.index }}` - The zero-based iteration index (0, 1, 2, ...)\n" +
    "- `{{ row.data.columnName }}` - The data item being processed\n\n" +
    "Example: For Google Sheets destinations, calculate the row number with `{{ $number(row.index) + 2 }}` (accounting for header row and 1-based indexing).",
  "x-tags": ["Nodes"],
});

export type IteratorNode = z.infer<typeof IteratorNodeSchema>;
