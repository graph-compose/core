import { z } from "zod";
import { NodeResultSchema } from "../nodes/common/baseResult";
import { GlobalContextSchema } from "./context";
import { RowInputSchema, RowsMapSchema } from "./rowInput";

export const WorkflowResultsSchema = z.object({
  context: GlobalContextSchema,
  results: z.record(z.string(), NodeResultSchema).default({}),
  row: RowInputSchema.optional(),
  rows: RowsMapSchema,
});

export type WorkflowResults = z.infer<typeof WorkflowResultsSchema>;
