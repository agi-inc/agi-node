/**
 * Type definitions for AGI SDK
 */

// ===== RESULT TYPES =====

export type { TaskResult, TaskMetadata } from './results';
export { Screenshot } from './screenshot';

// ===== SNAPSHOT MODE =====

export type SnapshotMode = 'none' | 'memory' | 'filesystem';

// ===== AGENT SESSION TYPES =====

export type AgentSessionType = 'managed-cdp' | 'external-cdp' | 'desktop';

// ===== SESSION STATUS & EVENTS =====

export type SessionStatus =
  | 'ready'
  | 'running'
  | 'waiting_for_input'
  | 'paused'
  | 'finished'
  | 'error';

export type EventType =
  | 'step'
  | 'thought'
  | 'question'
  | 'done'
  | 'error'
  | 'log'
  | 'paused'
  | 'resumed'
  | 'heartbeat'
  | 'user';

export type MessageType = 'THOUGHT' | 'QUESTION' | 'USER' | 'DONE' | 'ERROR' | 'LOG';

// ===== CLIENT OPTIONS =====

export interface AGIClientOptions {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for API (default: https://api.agi.tech) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 60000) */
  timeout?: number;
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
}

// ===== SESSION TYPES =====

export interface CreateSessionOptions {
  /** Webhook URL for session event notifications */
  webhookUrl?: string;
  /** Task goal (optional, can be set later via sendMessage) */
  goal?: string;
  /** Maximum number of agent steps (default: 100) */
  maxSteps?: number;
  /** Environment UUID to restore from */
  restoreFromEnvironmentId?: string;
  /** Agent session type */
  agentSessionType?: AgentSessionType;
  /** External CDP WebSocket URL (required for external-cdp session type) */
  cdpUrl?: string;
}

export interface SessionResponse {
  /** Session UUID */
  sessionId: string;
  /** VNC URL for browser access */
  vncUrl?: string;
  /** Agent service URL (desktop mode) */
  agentUrl?: string;
  /** Agent name */
  agentName: string;
  /** Session status */
  status: SessionStatus;
  /** Session creation timestamp */
  createdAt: string;
  /** Environment UUID for restore */
  environmentId?: string;
  /** Task goal */
  goal?: string;
  /** Agent session type */
  agentSessionType?: string;
}

export interface ExecuteStatusResponse {
  /** Current execution status */
  status: SessionStatus;
}

export interface MessageResponse {
  /** Message ID */
  id: number;
  /** Message type */
  type: MessageType;
  /** Message content */
  content: string | Record<string, unknown> | Array<Record<string, unknown>>;
  /** ISO timestamp */
  timestamp: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface MessagesResponse {
  /** List of messages */
  messages: MessageResponse[];
  /** Current execution status */
  status: string;
  /** Whether agent is connected */
  hasAgent: boolean;
}

export interface SSEEvent {
  /** Event ID */
  id?: string;
  /** Event type */
  event: EventType;
  /** Event data */
  data: Record<string, unknown>;
}

export interface NavigateResponse {
  /** Current URL after navigation */
  currentUrl: string;
}

export interface ScreenshotResponse {
  /** Base64-encoded JPEG data URL */
  screenshot: string;
  /** Current page URL */
  url: string;
  /** Current page title */
  title: string;
}

export interface SuccessResponse {
  /** Operation success */
  success: boolean;
  /** Success message */
  message: string;
}

export interface DeleteResponse {
  /** Operation success */
  success: boolean;
  /** Whether resource was deleted */
  deleted: boolean;
  /** Response message */
  message: string;
}

// ===== MESSAGE OPTIONS =====

export interface MessageOptions {
  /** Optional starting URL */
  startUrl?: string;
  /** Optional configuration updates */
  configUpdates?: Record<string, unknown>;
}

export interface RunTaskOptions {
  /** Optional starting URL */
  startUrl?: string;
  /** Optional configuration updates */
  configUpdates?: Record<string, unknown>;
  /** Maximum time to wait for task completion in milliseconds (default: 600000 = 10 min) */
  timeout?: number;
  /** Polling interval in milliseconds (default: 3000 = 3s) */
  pollInterval?: number;
}

export interface StreamOptions {
  /** Event types to filter */
  eventTypes?: EventType[];
  /** Sanitize event data */
  sanitize?: boolean;
  /** Include historical events */
  includeHistory?: boolean;
}

// ===== DESKTOP AGENT TYPES =====

export type DesktopActionType =
  | 'click'
  | 'double_click'
  | 'triple_click'
  | 'right_click'
  | 'hover'
  | 'type'
  | 'key'
  | 'scroll'
  | 'drag'
  | 'wait'
  | 'finish'
  | 'fail'
  | 'confirm'
  | 'ask_question';

export interface DesktopAction {
  /** Action type */
  type: DesktopActionType | string;
  /** X coordinate (for click, hover, scroll) */
  x?: number;
  /** Y coordinate (for click, hover, scroll) */
  y?: number;
  /** Text to type (for type action) */
  text?: string;
  /** Content to type (alias for text) */
  content?: string;
  /** Key or key combination (for key action) */
  key?: string;
  /** Scroll direction (for scroll action) */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Scroll amount in lines (for scroll action) */
  amount?: number;
  /** Wait duration in seconds (for wait action) */
  duration?: number;
  /** Start X coordinate (for drag action) */
  start_x?: number;
  /** Start Y coordinate (for drag action) */
  start_y?: number;
  /** End X coordinate (for drag action) */
  end_x?: number;
  /** End Y coordinate (for drag action) */
  end_y?: number;
  /** Summary message (for finish action) */
  summary?: string;
  /** Reason message (for fail action) */
  reason?: string;
  /** Question to ask (for ask_question action) */
  question?: string;
  /** Additional action properties */
  [key: string]: unknown;
}

export interface StepDesktopRequest {
  /** Base64-encoded screenshot (full resolution). Viewport dimensions are extracted from the image. */
  screenshot: string;
  /** Optional user message (e.g., initial goal or follow-up instruction) */
  message?: string;
}

export interface StepDesktopResponse {
  /** Actions to execute (flat format) */
  actions: DesktopAction[];
  /** Model reasoning */
  thinking?: string;
  /** Whether the task is complete */
  finished: boolean;
  /** Question for user, if any */
  askUser?: string;
  /** Current step number */
  step: number;
}

export interface ModelsResponse {
  /** Available agent models */
  models: string[];
}
