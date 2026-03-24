export const WORKFLOW_QUERIES = {
  EXECUTION_STATE: "getExecutionState",
  NODE_RESULT: "getNodeResult",
  NODE_STATE: "getNodeState",
  WAITING_CONFIRMATION_NODE: "getWaitingConfirmationNodeId",
} as const;

export const WORKFLOW_SIGNALS = {
  CONFIRM_NODE: "confirmNode",
} as const;

export const ADK_QUERIES = {
  GET_LATEST_ORCHESTRATION_RESULT: "get_latest_orchestration_result",
  GET_SESSION_EVENTS: "get_session_events",
  GET_PENDING_CONFIRMATION_DETAILS: "get_pending_confirmation_details",
  IS_WAITING_FOR_CONFIRMATION: "is_waiting_for_confirmation",
  GET_LATEST_INVOCATION_TRACE: "get_latest_invocation_trace",
} as const;

export const ADK_SIGNALS = {
  CONFIRM_ACTION: "confirm_action",
  END_CONVERSATION: "end_conversation",
  RECEIVE_MESSAGE: "receive_message",
} as const;

export const TASK_QUEUES = {
  adk: "adk-task-queue",
  http: "http-worker",
};

export const WORKFLOW_NAMES = {
  ADK_AGENT_WORKFLOW: "AdkAgentWorkflow",
  HTTP_WORKFLOW: "httpWorkflow",
};
