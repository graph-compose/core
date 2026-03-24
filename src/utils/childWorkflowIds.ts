import { WorkflowInfo } from "../workflow";

/**
 * Child Workflow ID generation utilities
 * Format: adk-${parentWorkflowId}-${nodeId} for ADK nodes (prefixed with 'adk-' for easy identification)
 *         ${parentWorkflowId}-row-${index} for iterator items
 *         ${parentWorkflowId}-forEach-${nodeId}-${index} for forEach items
 */
export class ChildWorkflowIds {
  /**
   * Generate a child workflow ID for an ADK node
   * @param parentWorkflowId - The parent workflow ID
   * @param nodeId - The ADK node ID
   * @returns Generated ADK child workflow ID in format: adk-${parentWorkflowId}-${nodeId}
   */
  static adk(parentWorkflowId: string, nodeId: string): string {
    return `adk-${parentWorkflowId}-${nodeId}`;
  }

  /**
   * Generate a child workflow ID for an iterator item
   * @param parentWorkflowId - The parent workflow ID
   * @param index - The iteration index (0-based)
   * @returns Generated iterator child workflow ID in format: ${parentWorkflowId}-row-${index}
   */
  static iterator(parentWorkflowId: string, index: number): string {
    return `${parentWorkflowId}-row-${index}`;
  }

  /**
   * Parse an ADK child workflow ID to extract parent workflow ID and node ID
   * Format: adk-${parentWorkflowId}-${nodeId}
   * @param adkChildWorkflowId - The ADK child workflow ID
   * @returns Object containing parent workflow ID and node ID, or null if invalid
   */
  static parseAdk(
    adkChildWorkflowId: string,
  ): { parentWorkflowId: string; nodeId: string } | null {
    // Must start with "adk-"
    if (!adkChildWorkflowId.startsWith("adk-")) return null;

    // Remove "adk-" prefix
    const withoutPrefix = adkChildWorkflowId.substring(4);

    // Find the last dash to split parent ID and node ID
    const lastDashIndex = withoutPrefix.lastIndexOf("-");
    if (lastDashIndex === -1) return null;

    const parentWorkflowId = withoutPrefix.substring(0, lastDashIndex);
    const nodeId = withoutPrefix.substring(lastDashIndex + 1);

    return {
      parentWorkflowId,
      nodeId,
    };
  }

  /**
   * Parse an iterator child workflow ID to extract parent workflow ID and index
   * Format: ${parentWorkflowId}-row-${index}
   * @param iteratorChildWorkflowId - The iterator child workflow ID
   * @returns Object containing parent workflow ID and index, or null if invalid
   */
  static parseIterator(
    iteratorChildWorkflowId: string,
  ): { parentWorkflowId: string; index: number } | null {
    const match = iteratorChildWorkflowId.match(/^(.+)-row-(\d+)$/);
    if (!match) return null;

    const index = parseInt(match[2], 10);
    if (isNaN(index)) return null;

    return {
      parentWorkflowId: match[1],
      index,
    };
  }

  /**
   * Generate a child workflow ID for a forEach item
   * @param parentWorkflowId - The parent workflow ID
   * @param nodeId - The forEach node ID
   * @param index - The iteration index (0-based)
   * @returns Generated forEach child workflow ID in format: ${parentWorkflowId}-forEach-${nodeId}-${index}
   */
  static forEach(
    parentWorkflowId: string,
    nodeId: string,
    index: number,
  ): string {
    return `${parentWorkflowId}-forEach-${nodeId}-${index}`;
  }

  /**
   * Parse a forEach child workflow ID to extract parent workflow ID, node ID, and index
   * Format: ${parentWorkflowId}-forEach-${nodeId}-${index}
   * @param forEachChildWorkflowId - The forEach child workflow ID
   * @returns Object containing parent workflow ID, node ID, and index, or null if invalid
   */
  static parseForEach(
    forEachChildWorkflowId: string,
  ): {
    parentWorkflowId: string;
    nodeId: string;
    index: number;
  } | null {
    const match = forEachChildWorkflowId.match(/^(.+)-forEach-(.+)-(\d+)$/);
    if (!match) return null;

    const index = parseInt(match[3], 10);
    if (isNaN(index)) return null;

    return {
      parentWorkflowId: match[1],
      nodeId: match[2],
      index,
    };
  }

  /**
   * Determine the type of child workflow based on its ID
   * @param childWorkflowId - Any child workflow ID
   * @returns The type of child workflow or 'unknown' if not recognized
   */
  static getType(
    childWorkflowId: string,
  ): "adk" | "iterator" | "forEach" | "unknown" {
    // ADK format: starts with "adk-"
    if (childWorkflowId.startsWith("adk-")) return "adk";

    // forEach format: contains "-forEach-" with nodeId and index
    if (childWorkflowId.match(/-forEach-.+-\d+$/)) return "forEach";

    // Iterator format: parentId-row-index
    if (childWorkflowId.match(/-row-\d+$/)) return "iterator";

    return "unknown";
  }

  /**
   * Check if a workflow ID is a child workflow
   * Attempts to parse as ADK, iterator, or forEach to determine if it's a valid child workflow
   * @param workflowId - The workflow ID to check
   * @returns True if this appears to be a child workflow ID
   */
  static isChildWorkflow(workflowId: string): boolean {
    return (
      this.parseAdk(workflowId) !== null ||
      this.parseIterator(workflowId) !== null ||
      this.parseForEach(workflowId) !== null
    );
  }

  /**
   * Check if a workflow ID is an ADK child workflow
   * @param workflowId - The workflow ID to check
   * @returns True if this is an ADK child workflow ID (starts with "adk-")
   */
  static isAdkWorkflow(workflowId: string): boolean {
    return workflowId.startsWith("adk-");
  }

  /**
   * Check if a workflow ID is an iterator child workflow
   * @param workflowId - The workflow ID to check
   * @returns True if this is an iterator child workflow ID (ends with "-row-{number}")
   */
  static isIteratorWorkflow(workflowId: string): boolean {
    return /-row-\d+$/.test(workflowId);
  }

  /**
   * Check if a workflow ID is a forEach child workflow
   * @param workflowId - The workflow ID to check
   * @returns True if this is a forEach child workflow ID (contains "-forEach-")
   */
  static isForEachWorkflow(workflowId: string): boolean {
    return /-forEach-.+-\d+$/.test(workflowId);
  }
}

/**
 * Convenience functions for backward compatibility and ease of use
 */

/**
 * Generate an ADK child workflow ID
 * @param workflowInfo - Parent workflow information
 * @param nodeId - The ADK node ID
 * @returns Generated ADK child workflow ID
 */
export function generateAdkChildWorkflowId(
  workflowInfo: WorkflowInfo,
  nodeId: string,
): string {
  return ChildWorkflowIds.adk(workflowInfo.workflowId, nodeId);
}

/**
 * Generate an iterator child workflow ID
 * @param workflowInfo - Parent workflow information
 * @param index - The iteration index
 * @returns Generated iterator child workflow ID
 */
export function generateIteratorChildWorkflowId(
  workflowInfo: WorkflowInfo,
  index: number,
): string {
  return ChildWorkflowIds.iterator(workflowInfo.workflowId, index);
}
