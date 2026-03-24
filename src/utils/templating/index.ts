import jsonata from "jsonata";
import { WorkflowResults } from "../../workflow";

// =============================================================================
// Template Expression Parser
// =============================================================================

export interface TemplateMatch {
  expression: string; // Inner expression (trimmed, without {{ }})
  start: number; // Index of opening {{ in the input
  end: number; // Index after closing }}
  fullMatch: string; // The complete {{ expression }} text
}

/**
 * Parses a string and extracts all {{ expression }} template matches.
 * Unlike a simple regex, this parser correctly handles:
 * - Nested { } inside the expression (tracks brace depth)
 * - JSONata string literals (single and double quotes) where braces are ignored
 * - Backslash escapes inside string literals
 */
export function extractTemplateExpressions(input: string): TemplateMatch[] {
  const matches: TemplateMatch[] = [];
  let i = 0;

  while (i < input.length - 1) {
    // Look for opening {{
    if (input[i] === "{" && input[i + 1] === "{") {
      const start = i;
      i += 2; // Skip past {{

      let depth = 0;
      let inSingleQuote = false;
      let inDoubleQuote = false;
      const exprStart = i;
      let found = false;

      while (i < input.length) {
        const ch = input[i];

        // Handle escape sequences inside string literals
        if ((inSingleQuote || inDoubleQuote) && ch === "\\") {
          i += 2; // Skip escaped character
          continue;
        }

        // Handle string literal boundaries
        if (ch === "'" && !inDoubleQuote) {
          inSingleQuote = !inSingleQuote;
        } else if (ch === '"' && !inSingleQuote) {
          inDoubleQuote = !inDoubleQuote;
        }

        // Only track braces outside of string literals
        if (!inSingleQuote && !inDoubleQuote) {
          if (ch === "{") {
            depth++;
          } else if (ch === "}") {
            if (depth > 0) {
              depth--;
            } else if (i + 1 < input.length && input[i + 1] === "}") {
              // Found closing }} at depth 0
              const expression = input.slice(exprStart, i);
              const end = i + 2;
              matches.push({
                expression: expression.trim(),
                start,
                end,
                fullMatch: input.slice(start, end),
              });
              i = end;
              found = true;
              break;
            }
          }
        }

        i++;
      }

      // If we never found closing }}, skip past the opening {{
      if (!found) {
        i = start + 2;
      }
    } else {
      i++;
    }
  }

  return matches;
}

// =============================================================================
// Convenience Wrappers
// =============================================================================

/**
 * Extracts JSONata expression from a template string if it matches {{ expr }} format.
 * Returns null if the string is not a single, complete template expression.
 */
export function extractJsonataExpression(template: string): string | null {
  const trimmed = template.trim();
  const matches = extractTemplateExpressions(trimmed);
  if (
    matches.length === 1 &&
    matches[0].start === 0 &&
    matches[0].end === trimmed.length
  ) {
    return matches[0].expression;
  }
  return null;
}

/**
 * Type guard to check if a string contains template expressions
 */
export function hasTemplateExpressions(value: string): boolean {
  return extractTemplateExpressions(value).length > 0;
}

/**
 * Extracts all template expressions from a string
 */
export function extractAllExpressions(template: string): string[] {
  return extractTemplateExpressions(template).map(m => m.expression);
}

// =============================================================================
// Normalization & Validation
// =============================================================================

/**
 * Normalizes template strings by removing newlines within {{ }} expressions
 */
export function normalizeTemplate(template: string): string {
  const matches = extractTemplateExpressions(template);
  if (matches.length === 0) return template;

  let result = template;
  // Process in reverse order to preserve indices
  for (let idx = matches.length - 1; idx >= 0; idx--) {
    const m = matches[idx];
    const normalized = m.expression.replace(/\s*\n\s*/g, " ");
    result =
      result.slice(0, m.start) + `{{${normalized}}}` + result.slice(m.end);
  }
  return result;
}

/**
 * Validates a single JSONata expression
 */
export function validateJsonataExpression(expression: string): boolean {
  try {
    jsonata(expression.trim());
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a template string that may contain multiple JSONata expressions
 */
export function validateTemplateExpression(template: string): boolean {
  const matches = extractTemplateExpressions(template);

  if (matches.length === 0) return false;

  return matches.every(m => validateJsonataExpression(m.expression));
}

/**
 * Collects validation errors for all JSONata expressions in an object
 */
export function validateNestedExpressions(
  obj: any,
  path: string[] = [],
): Array<{ path: string[]; expression: string; error: string }> {
  const errors: Array<{ path: string[]; expression: string; error: string }> =
    [];

  if (typeof obj === "string") {
    // First check for mismatched {{ }}
    const openCount = (obj.match(/\{\{/g) || []).length;
    const closeCount = (obj.match(/\}\}/g) || []).length;

    if (openCount !== closeCount) {
      errors.push({
        path,
        expression: obj,
        error: "Unclosed template expression (mismatched braces)",
      });
      return errors; // Don't continue if braces are mismatched
    }

    const matches = extractTemplateExpressions(obj);
    if (matches.length === 0) return errors;

    for (const m of matches) {
      const innerExpr = m.expression;

      // Check for empty expressions
      if (!innerExpr) {
        errors.push({
          path,
          expression: m.fullMatch,
          error: "Empty template expression",
        });
        continue;
      }

      // Check for balanced parentheses
      let parenCount = 0;
      let inSingleQuote = false;
      let inDoubleQuote = false;
      let unbalanced = false;
      for (let ci = 0; ci < innerExpr.length; ci++) {
        const ch = innerExpr[ci];
        if ((inSingleQuote || inDoubleQuote) && ch === "\\") {
          ci++; // skip escaped char
          continue;
        }
        if (ch === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
        else if (ch === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;

        if (!inSingleQuote && !inDoubleQuote) {
          if (ch === "(") parenCount++;
          if (ch === ")") parenCount--;
          if (parenCount < 0) {
            errors.push({
              path,
              expression: innerExpr,
              error: "Unbalanced parentheses",
            });
            unbalanced = true;
            break;
          }
        }
      }
      if (unbalanced) continue;
      if (parenCount !== 0) {
        errors.push({
          path,
          expression: innerExpr,
          error: "Unbalanced parentheses",
        });
        continue;
      }

      try {
        jsonata(innerExpr);
      } catch (e) {
        errors.push({
          path,
          expression: innerExpr,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
  } else if (typeof obj === "object" && obj !== null) {
    Object.entries(obj).forEach(([key, value]) => {
      errors.push(...validateNestedExpressions(value, [...path, key]));
    });
  }

  return errors;
}

// =============================================================================
// Expression Type Inference
// =============================================================================

/**
 * Infers the return type of a JSONata expression
 */
function inferExpressionType(ast: any): { type: string } {
  // Handle basic types
  if (
    ast.type === "boolean" ||
    ast.type === "comparison" ||
    ast.type === "condition" ||
    ast.type === "regex"
  ) {
    return { type: "boolean" };
  }

  // Handle binary operations that result in boolean
  if (
    ast.type === "binary" &&
    ["=", "!=", "<", "<=", ">", ">=", "in"].includes(ast.value)
  ) {
    return { type: "boolean" };
  }

  // For other types, return their type directly
  return { type: ast.type };
}

/**
 * Validates that a JSONata expression returns a boolean
 * Throws an error if the expression is invalid or doesn't return a boolean
 */
export function validateBooleanExpression(expression: string): boolean {
  try {
    const ast = jsonata(expression).ast();
    const inferredType = inferExpressionType(ast);
    return inferredType.type === "boolean";
  } catch {
    return false;
  }
}

// =============================================================================
// Template Evaluation
// =============================================================================

/**
 * Evaluates a template string or object containing JSONata expressions
 * within {{ }} delimiters against a context object
 */
export async function evaluateTemplate(
  template: any,
  context: WorkflowResults,
): Promise<any> {
  // Handle string templates with {{ }} expressions
  if (typeof template === "string") {
    const expr = extractJsonataExpression(template);
    if (expr) {
      try {
        const expression = jsonata(expr);

        // Register custom functions
        expression.registerFunction("parseJson", (str: string) => {
          try {
            // Strip markdown code fences if present (common in LLM responses)
            let cleaned = str.trim();
            if (cleaned.startsWith("```")) {
              cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
            }
            return JSON.parse(cleaned);
          } catch (e) {
            throw new Error(
              `Failed to parse JSON: ${e instanceof Error ? e.message : "Invalid JSON"}`,
            );
          }
        });

        return await expression.evaluate(context);
      } catch (e: any) {
        throw new Error(`JSONata evaluation failed: ${e.message}`);
      }
    }
    return template;
  }

  // Handle arrays recursively
  if (Array.isArray(template)) {
    return Promise.all(template.map(item => evaluateTemplate(item, context)));
  }

  // Handle objects recursively
  if (template && typeof template === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(template)) {
      result[key] = await evaluateTemplate(value, context);
    }
    return result;
  }

  return template;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Normalizes a JSONata expression by removing any node result prefixes.
 * This helps handle cases where users provide full path expressions like:
 * `results.node_id.property` when we just want `property`
 *
 * Only removes the first instance of 'results.nodeId.' to preserve any nested properties
 * that might legitimately start with 'results.'
 *
 * @param expression - The JSONata expression to normalize
 * @returns The normalized expression that evaluates against the current context
 *
 * @example
 * // Returns "state = 'completed'"
 * normalizeJsonataExpression("results.check_video_1_status.state = 'completed'")
 *
 * @example
 * // Returns "key1.key2.key3"
 * normalizeJsonataExpression("results.nodeId.key1.key2.key3")
 *
 * @example
 * // Returns "key1.results.key2.key3"
 * normalizeJsonataExpression("results.nodeId.key1.results.key2.key3")
 */
export function normalizeJsonataExpression(expression: string): string {
  // Only remove the first instance of 'results.someNodeId.'
  return expression.replace(/^results\.[^.]+\./, "");
}
