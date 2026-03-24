import { z } from "zod";

export const GlobalContextSchema = z.record(z.string(), z.any()).openapi({
  description: "Global context for the workflow",
});
export type GlobalContext = z.infer<typeof GlobalContextSchema>;
