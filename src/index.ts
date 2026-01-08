/**
 * AGI SDK - Official TypeScript/JavaScript client for AGI.tech API
 *
 * @packageDocumentation
 */

// Main client and context
export { AGIClient } from './client';
export { SessionContext } from './context';
export { SessionsResource } from './resources';

// Error classes
export {
  AGIError,
  APIError,
  AuthenticationError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  AgentExecutionError,
  ValidationError,
} from './errors';

// Types
export type {
  AGIClientOptions,
  CreateSessionOptions,
  SessionResponse,
  ExecuteStatusResponse,
  MessageResponse,
  MessagesResponse,
  SSEEvent,
  NavigateResponse,
  ScreenshotResponse,
  SuccessResponse,
  DeleteResponse,
  MessageOptions,
  RunTaskOptions,
  StreamOptions,
  SessionStatus,
  EventType,
  MessageType,
  SnapshotMode,
  TaskResult,
  TaskMetadata,
} from './types';

export { Screenshot } from './types/screenshot';
