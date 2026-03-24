# @graph-compose/core

Core TypeScript types, Zod schemas, and validation logic for Graph Compose workflow graphs.

> **Note:** This package provides the foundational type definitions and schemas. If you want a fluent builder API to programmatically construct and execute workflows, use [`@graph-compose/client`](../client/README.md) instead. This package is for developers who need to interact directly with the underlying workflow structures or build custom tooling.

## Installation

```bash
npm install @graph-compose/core
# or
pnpm add @graph-compose/core
# or
yarn add @graph-compose/core
```

> **Tip:** If you're using `@graph-compose/client`, all commonly-used core types are re-exported from it, so you don't need to install this package separately.

## The Workflow Graph

Everything revolves around the `WorkflowGraph`. This object describes the complete structure of your workflow.

```typescript
import { WorkflowGraphSchema } from '@graph-compose/core';
import { z } from 'zod';

const myWorkflow = {
  nodes: [
    {
      id: 'fetch_user',
      type: 'http',
      dependencies: [],
      http: {
        method: 'GET',
        url: 'https://api.example.com/users/{{context.userId}}'
      }
    },
    {
      id: 'process_user',
      type: 'http',
      dependencies: ['fetch_user'],
      http: {
        method: 'POST',
        url: 'https://api.example.com/process',
        headers: { 'Content-Type': 'application/json' },
        body: { data: '{{results.fetch_user.data}}' }
      }
    }
  ],
  context: { userId: 'user_123' },
  webhookUrl: 'https://my-service.com/webhook'
};

// Validate
try {
  const validated = WorkflowGraphSchema.parse(myWorkflow);
  console.log('Valid workflow!');
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation failed:', error.errors);
  }
}

// Infer types
type MyWorkflow = z.infer<typeof WorkflowGraphSchema>;
```

### WorkflowGraph Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `nodes` | `Node[]` | Yes | Array of workflow nodes |
| `context` | `Record<string, any>` | No | Initial data available to all nodes via `{{context.*}}` |
| `webhookUrl` | `string` | No | URL to notify on workflow events |
| `workflowConfig` | `WorkflowConfig` | No | Workflow-level settings (e.g., execution timeout) |
| `meta` | `Record<string, any>` | No | Additional metadata |

### WorkflowConfig

```typescript
{
  workflowExecutionTimeout?: Duration  // e.g., "5 minutes", "1h"
}
```

## Node Types

All nodes share a base structure:

```typescript
{
  id: string;          // Alphanumeric + underscores only (no dashes)
  type: string;        // Node type discriminator
  activityConfig?: ActivityConfig;  // Optional retry/timeout config
}
```

### HTTP Node

The primary building block. Makes HTTP requests to external services.

```typescript
{
  id: 'fetch_data',
  type: 'http',
  dependencies: ['auth_node'],
  http: {
    method: 'GET',                                    // GET | POST | PUT | DELETE | PATCH | HEAD | OPTIONS
    url: 'https://api.example.com/data',
    headers: {
      'Authorization': 'Bearer {{$secret("api_token")}}',
      'X-Request-ID': '{{context.requestId}}'
    },
    body: {                                           // Not allowed for GET requests
      userId: '{{results.auth_node.data.userId}}'
    }
  },
  validation: {                                       // Optional JSON Schema validation
    input: { /* JSON Schema */ },
    output: { /* JSON Schema */ }
  },
  conditions: {                                       // Optional control flow
    terminateWhen: ['{{results.fetch_data.data.status = "done"}}'],
    continueTo: [
      { to: 'process_node', when: '{{results.fetch_data.data.ready = true}}' }
    ],
    pollUntil: ['{{results.fetch_data.data.complete = true}}']
  }
}
```

### Error Boundary Node

Catches and handles errors from protected nodes.

```typescript
{
  id: 'error_handler',
  type: 'error_boundary',
  protectedNodes: ['fetch_data', 'process_data'],    // Nodes to protect (cannot protect other error boundaries)
  http: {
    method: 'POST',
    url: 'https://api.example.com/error-handler',
    body: { error: '{{results.error}}', nodeId: '{{results.nodeId}}' }
  }
}
```

### Confirmation Node

Pauses workflow execution until a user signal is received.

```typescript
{
  id: 'approve_payment',
  type: 'confirmation',
  dependencies: ['process_payment']
}
```

Confirmation nodes are signaled via Temporal workflow signals (`confirmNode`).

### ForEach Node

Iterates over an array and spawns a child workflow for each element. Nodes between the `forEach` and its matching `endForEach` run inside each child workflow. Nodes downstream of the `endForEach` run in the parent workflow after all children complete.

```typescript
{
  id: 'process_users',
  type: 'forEach',
  dependencies: ['get_users'],
  forEach: {
    items: '{{ results.get_users.data.users }}'      // JSONata expression resolving to an array
  },
  config: {                                           // Optional
    concurrency: 5,                                   // Max parallel child workflows
    continueOnError: true,                            // Complete even if some children fail
    maxFailures: 10,                                  // Abort after this many child failures
    childWorkflowConfig: {                            // Per-child timeout/retry
      workflowExecutionTimeout: '5 minutes',
      retry: { maximumAttempts: 3 }
    }
  }
}
```

Child workflows get access to:
- `{{row.index}}` - zero-based iteration index
- `{{row.data}}` - the current array element
- `{{row.data.property}}` - nested properties on the element

### EndForEach Node

Marks the end of a forEach loop body. Nodes downstream of this node run in the parent workflow with access to aggregated results via `{{ results.<forEachId>.data.items }}`.

```typescript
{
  id: 'process_users_end',
  type: 'endForEach',
  forEachId: 'process_users',                        // ID of the forEach node this closes
  dependencies: ['enrich_user']                       // Last node(s) inside the loop
}
```

### ADK Node

Embeds an entire Agent Development Kit workflow as a single node, enabling multi-agent AI orchestration.

```typescript
{
  id: 'ai_workflow',
  type: 'adk',
  dependencies: ['fetch_context'],
  config: {
    rootAgentId: 'coordinator',
    agents: [
      {
        type: 'LlmAgent',
        id: 'coordinator',
        httpConfig: { url: 'https://llm.example.com', method: 'POST' },
        tools: ['search_tool'],
        outputKey: 'coordinator_response'
      }
    ],
    globalTools: [
      {
        type: 'HttpTool',
        id: 'search_tool',
        httpConfig: { url: 'https://api.example.com/search', method: 'POST' },
        outputKey: 'search_results'
      }
    ],
    maxOrchestrationCycles: 10,
    initialUserInput: 'Help me with this task',
    state: { user_id: '123' }
  }
}
```

#### Agent Types

| Type | Description |
|---|---|
| `LlmAgent` | Language model agent with HTTP config, tools, and optional sub-agents |
| `SequentialAgent` | Executes sub-agents one after another (runs natively, not as HTTP activity) |
| `ParallelAgent` | Executes sub-agents concurrently (runs natively) |
| `LoopAgent` | Repeats sub-agents until exit condition or max iterations |

#### Global Tool Types

| Type | Description |
|---|---|
| `HttpTool` | Makes HTTP calls when invoked by agents |
| `AgentTool` | Delegates to another agent (specialist pattern) |

### Iterator Node

Processes collections by creating virtual copies of downstream nodes for each item. Used internally by the UI.

```typescript
{
  id: 'iterate_items',
  type: 'source_iterator',
  dependencies: [],                   // Must be empty
  http: {
    method: 'GET',
    url: 'https://api.example.com/items'
  }
}
```

Child workflows get access to `{{row.index}}` and `{{row.data.columnName}}`.

### Destination Node

Outputs data to specific destinations (e.g., spreadsheets). Used internally by the UI.

```typescript
{
  id: 'save_to_sheet',
  type: 'destination',
  dependencies: ['process_data'],
  http: {
    method: 'POST',
    url: 'https://api.example.com/destination',
    body: {
      sheetId: 'your_sheet_id',
      cellValues: [
        { columnName: 'Name', value: '{{results.process_data.data.name}}' },
        { columnName: 'Email', value: '{{results.process_data.data.email}}' }
      ]
    }
  }
}
```

## Activity Configuration

Controls Temporal activity behavior (retries and timeouts) for any node.

```typescript
{
  activityConfig: {
    startToCloseTimeout: '30s',         // Max time for activity to complete once started
    scheduleToCloseTimeout: '5m',       // Max time from scheduling to completion
    retryPolicy: {
      maximumAttempts: 5,
      initialInterval: '1s',
      backoffCoefficient: 2.0,
      maximumInterval: '30s'
    }
  }
}
```

Duration strings use the [ms](https://github.com/vercel/ms) library format: `'30s'`, `'5m'`, `'1h'`, `'2d'`, etc.

## JSONata Expressions

All string fields support dynamic expressions using `{{ }}` delimiters with full [JSONata](https://jsonata.org/) support.

### Available Namespaces

```typescript
// Node results (each result has shape { data, statusCode, headers })
'{{results.fetch_user.data.id}}'
'{{results.fetch_user.data.profile.name}}'

// Workflow context
'{{context.userId}}'
'{{context.tenant.name}}'

// Secrets
'{{$secret("api_key")}}'

// Iterator / forEach data (in child workflows)
'{{row.index}}'
'{{row.data.columnName}}'

// Ancestor forEach rows (in nested forEach child workflows)
'{{rows.forEach_depts.data.name}}'

// ADK session state
'{{state.user_preferences.theme}}'
```

### JSONata Functions

```typescript
// String operations
'{{$uppercase(results.fetch_user.data.name)}}'
'{{$substring(results.fetch_text.data.content, 0, 100)}}'

// Arithmetic
'{{results.get_price.data.amount * 1.1}}'

// Array operations
'{{$count(results.list_items.data.items)}}'
'{{results.list_items.data.items[status = "active"]}}'

// Conditionals
'{{results.check_status.data.code = 200 ? "success" : "failure"}}'

// Timestamps
'{{$now()}}'
```

### Boolean Expressions (for Conditions)

Used in `terminateWhen`, `continueTo.when`, and `pollUntil`:

```typescript
'{{results.check_status.data.state = "done"}}'
'{{results.fetch_data.data.count > 10}}'
'{{results.health_check.data.ready = true}}'
```

## Validation Utilities

```typescript
import {
  validateJsonataExpression,
  validateTemplateExpression,
  validateBooleanExpression,
  validateNestedExpressions,
  extractJsonataExpression,
  extractAllExpressions,
  hasTemplateExpressions,
} from '@graph-compose/core';

// Validate a raw JSONata expression
validateJsonataExpression('results.user.data.name');

// Validate a template string with {{ }} delimiters
validateTemplateExpression('Hello {{results.user.data.name}}');

// Validate a boolean expression for conditions
validateBooleanExpression('{{results.status.data.state = "done"}}');

// Find all expression errors in a nested object
const errors = validateNestedExpressions(myObject, ['nodeId']);

// Check if a value contains template expressions
if (hasTemplateExpressions(someValue)) { /* ... */ }

// Extract expressions from templates
const exprs = extractAllExpressions('{{a}} and {{b}}'); // ['a', 'b']
```

## Constants

Temporal workflow queries, signals, and task queue names:

```typescript
import {
  WORKFLOW_QUERIES,
  WORKFLOW_SIGNALS,
  ADK_QUERIES,
  ADK_SIGNALS,
  TASK_QUEUES,
  WORKFLOW_NAMES,
} from '@graph-compose/core';

// HTTP workflow queries
WORKFLOW_QUERIES.EXECUTION_STATE              // "getExecutionState"
WORKFLOW_QUERIES.NODE_RESULT                  // "getNodeResult"
WORKFLOW_QUERIES.NODE_STATE                   // "getNodeState"
WORKFLOW_QUERIES.WAITING_CONFIRMATION_NODE    // "getWaitingConfirmationNodeId"

// HTTP workflow signals
WORKFLOW_SIGNALS.CONFIRM_NODE       // "confirmNode"

// ADK workflow queries
ADK_QUERIES.GET_SESSION_EVENTS     // "get_session_events"
ADK_QUERIES.GET_LATEST_ORCHESTRATION_RESULT

// ADK workflow signals
ADK_SIGNALS.RECEIVE_MESSAGE        // "receive_message"
ADK_SIGNALS.CONFIRM_ACTION         // "confirm_action"
ADK_SIGNALS.END_CONVERSATION       // "end_conversation"

// Task queues
TASK_QUEUES.adk                     // "adk-task-queue"
TASK_QUEUES.http                    // "http-worker"
```

## Workflow State Types

### HTTP Workflow State

```typescript
import type { GraphWorkflowState, NodeResult } from '@graph-compose/core';

// GraphWorkflowState
{
  context: Record<string, any>;           // Current global context
  executed: string[];                      // Completed node IDs
  results: Record<string, NodeResult>;     // Node results keyed by ID
}

// NodeResult
{
  data: any;                               // Response data
  statusCode?: number;                     // HTTP status code
  headers?: Record<string, string>;        // Response headers
}
```

### ADK Workflow State

```typescript
import type { AdkWorkflowState } from '@graph-compose/core';

{
  latestOrchestrationResult?: AdkOrchestrationResult;
  conversationHistory: AdkSessionEvent[];
  pendingConfirmations?: Record<string, AdkPendingConfirmation>;
  isWaitingForConfirmation: boolean;
  latestInvocationTrace?: AdkInvocationTrace;
  isStopped?: boolean;
  conversationEndRequested?: boolean;
}
```

### Webhook Payloads

```typescript
import type { WebhookPayload, NodeWebhookPayload, CompletionWebhookPayload } from '@graph-compose/core';

// WebhookPayload
{
  workflowId: string;
  runId: string;
  type: "node" | "completion";
  data: NodeWebhookPayload | CompletionWebhookPayload;
}
```

## Exported Schemas

All Zod schemas for runtime validation:

```typescript
import {
  // Workflow
  WorkflowGraphSchema,

  // Node schemas
  NodeSchema,               // Discriminated union of all node types
  HttpNodeSchema,
  ErrorBoundaryNodeSchema,
  ConfirmationNodeSchema,
  AdkNodeSchema,
  ForEachNodeSchema,
  EndForEachNodeSchema,
  IteratorNodeSchema,
  DestinationNodeSchema,

  // Common schemas
  HTTPConfigSchema,
  ActivityConfigSchema,
  RetryPolicySchema,
  NodeConditionsSchema,
  ValidationSchema,
  ChildWorkflowConfigSchema,

  // ADK schemas
  ADKWorkflowDefinitionSchema,
  AgentConfigSchema,
  LlmAgentConfigSchema,
  SequentialAgentConfigSchema,
  ParallelAgentConfigSchema,
  LoopAgentConfigSchema,
  GlobalToolDefinitionSchema,
  GlobalHttpToolDefinitionSchema,
  GlobalAgentToolDefinitionSchema,

  // Result schemas
  NodeResultSchema,
} from '@graph-compose/core';
```

## TypeScript Types

All types are inferred from Zod schemas:

```typescript
import type {
  // Workflow
  WorkflowGraph,
  WorkflowConfig,
  WorkflowResults,

  // Nodes
  Node,
  HttpNode,
  ErrorBoundaryNode,
  ConfirmationNode,
  ForEachNode,
  EndForEachNode,
  AdkNode,
  IteratorNode,
  DestinationNode,

  // HTTP
  HTTPConfig,
  JsonataParam,

  // Conditions
  NodeConditions,
  FlowControl,

  // Activity
  ActivityConfig,
  RetryPolicy,
  ChildWorkflowConfig,

  // ADK
  ADKWorkflowDefinition,
  AgentConfig,
  LlmAgentConfig,
  SequentialAgentConfig,
  ParallelAgentConfig,
  LoopAgentConfig,
  GlobalToolDefinition,
  GlobalHttpToolDefinition,
  GlobalAgentToolDefinition,
  SubAgentReference,

  // State & Results
  GraphWorkflowState,
  NodeResult,
  AdkWorkflowState,
  RowInput,
  RowsMap,

  // Webhooks
  WebhookPayload,
} from '@graph-compose/core';
```

## Related Packages

| Package | Description |
|---------|-------------|
| [`@graph-compose/client`](https://www.npmjs.com/package/@graph-compose/client) | Fluent TypeScript SDK for building and executing workflows on the Graph Compose platform |
| [`@graph-compose/execution-kernel`](https://www.npmjs.com/package/@graph-compose/execution-kernel) | Lower-level execution primitives for building custom orchestrators |
| [`@graph-compose/runtime`](https://www.npmjs.com/package/@graph-compose/runtime) | Batteries-included HTTP workflow runtime built on the execution kernel |

## Requirements

- Node.js 18+
- TypeScript 5+ (recommended)

## License

This project is dual-licensed:

- **AGPL-3.0** for open-source use. See [LICENSE](./LICENSE) for details.
- **Commercial License** available for organizations that need an alternative to AGPL. Contact the maintainers for details.
