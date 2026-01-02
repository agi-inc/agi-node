/**
 * AGI SDK - Official TypeScript/JavaScript client for AGI.tech API
 *
 * @packageDocumentation
 */

// Main client and session
export { AGIClient } from './client';
export { Session } from './session';

// Error classes
export {
  AGIError,
  AuthenticationError,
  NotFoundError,
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
} from './types';
