import { z } from "zod";
import { JsonataObjectSchema } from "./templating";

export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
]);

export type HttpMethod = z.infer<typeof HttpMethodSchema>;

// Base schema for HTTP handlers
export const HTTPConfigSchema = z
  .object({
    method: HttpMethodSchema,
    url: z
      .string()
      .refine(
        url => {
          // Handle expressions with optional whitespace around them
          const urlWithoutExpressions = url.replace(
            /\{\{\s*(?:[^{}]|\{[^{}]*\})+\s*\}\}/g,
            "placeholder",
          );

          // Then check for any remaining {{ or }} which would indicate malformed expressions
          const hasValidBraces =
            !urlWithoutExpressions.includes("{{") &&
            !urlWithoutExpressions.includes("}}");

          if (!hasValidBraces) {
            return false;
          }

          // Now validate the URL structure
          try {
            new URL(urlWithoutExpressions);
            return true;
          } catch (error) {
            return false;
          }
        },
        {
          message:
            "Invalid URL format or malformed handlebars expressions. URL must be valid when expressions are evaluated and each '{{' must have a matching '}}'.",
        },
      )
      .openapi({
        description:
          "URL to make the request to. Can include JSONata expressions within '{{ }}' delimiters",
        example:
          "https://api.example.com/users/{{userId}}/posts?filter={{query.filter}}",
      }),
    headers: z
      .record(z.union([z.string(), JsonataObjectSchema]))
      .optional()
      .openapi({
        description:
          "HTTP headers. Values can be static strings or dynamic expressions using `{{ }}`. \nExpressions support [JSONata](https://jsonata.org/) for accessing `context` (`{{ context.var }}`), `results` (`{{ results.node.output }}`), and secrets (`{{ $secret('key') }}`).",
        example: {
          Authorization: "Bearer {{ $secret('api_token') }}",
          "X-User-ID": "{{ results.getUser.id }}",
          "X-Tenant-ID": "{{ context.tenantId }}",
        },
      }),
    body: JsonataObjectSchema.optional().openapi({
      description:
        "The request body (typically JSON). Can contain static values or dynamic expressions using `{{ }}`. \nExpressions support [JSONata](https://jsonata.org/) for accessing `context`, `results`, and secrets (`{{ $secret('key') }}`).",
      example: {
        orderId: "{{ results.createOrder.id }}",
        apiKey: "{{ $secret('payment_key') }}",
        customerRef: "{{ context.customerReference }}",
      },
    }),
  })
  .openapi({
    ref: "HttpConfiguration",
    description: "Configuration for an HTTP handler",
    "x-tags": ["Configuration"],
    example: {
      method: "GET",
      url: "https://api.example.com/users/{{userId}}/posts?filter={{query.filter}}",
    },
  });

export type HTTPConfig = z.infer<typeof HTTPConfigSchema>;
