/**
 * Type definitions for AGI SDK
 */

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
}

export interface StreamOptions {
  /** Event types to filter */
  eventTypes?: EventType[];
  /** Sanitize event data */
  sanitize?: boolean;
  /** Include historical events */
  includeHistory?: boolean;
}
