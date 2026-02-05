/**
 * AGI SDK - Official TypeScript/JavaScript client for AGI.tech API
 *
 * @packageDocumentation
 */

// Main client and context
export { AGIClient } from './client';
export { SessionContext } from './context';
export { SessionsResource } from './resources';

// Loop utilities
export {
  AgentLoop,
  type AgentLoopOptions,
  type LoopState,
  type CaptureScreenshotFn,
  type ExecuteActionsFn,
  type OnThinkingFn,
  type OnAskUserFn,
  type OnStepFn,
} from './loop';

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
  // Client options
  AGIClientOptions,
  // Session types
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
  // Client-driven session types
  DesktopAction,
  DesktopActionType,
  ModelsResponse,
  StepDesktopRequest,
  StepDesktopResponse,
  // Shared types
  AgentSessionType,
  SessionStatus,
  EventType,
  MessageType,
  SnapshotMode,
  TaskResult,
  TaskMetadata,
} from './types';

export { Screenshot } from './types/screenshot';

// Driver - local binary execution (spawns agi-driver binary)
export {
  AgentDriver,
  type DriverOptions,
  type DriverResult,
  type DriverEvent,
  type DriverAction,
  type DriverState,
  type DriverCommand,
  findBinaryPath,
  isBinaryAvailable,
  getPlatformId,
  type PlatformId,
} from './driver';

// Executor - cross-platform action execution
export { executeAction, executeActions, getScaleFactor, getScreenSize } from './executor';
