import { z } from "zod";

export const HTTPNodeResultSchema = z.any().openapi({
  description: "The resulting `data` or `text` returned from the HTTP call.",
  example: {
    order_id: 123,
    status: "success",
  },
});

export type HTTPNodeResult = z.infer<typeof HTTPNodeResultSchema>;
