/**
 * Driver module for spawning and managing the agi-driver binary.
 */

export { AgentDriver, type DriverOptions, type DriverResult } from './driver';

export {
  type DriverEvent,
  type DriverAction,
  type DriverState,
  type DriverCommand,
  type EventType,
  type CommandType,
  type ReadyEvent,
  type StateChangeEvent,
  type ThinkingEvent,
  type ActionEvent,
  type ConfirmEvent,
  type AskQuestionEvent,
  type FinishedEvent,
  type ErrorEvent,
  type ScreenshotCapturedEvent,
  type SessionCreatedEvent,
  type AudioTranscriptEvent,
  type VideoFrameEvent,
  type SpeechStartedEvent,
  type SpeechFinishedEvent,
  type TurnDetectedEvent,
  type StartCommand,
  type ScreenshotCommand,
  type PauseCommand,
  type ResumeCommand,
  type StopCommand,
  type ConfirmResponseCommand,
  type AnswerCommand,
  type GetAudioTranscriptCommand,
  type GetVideoFrameCommand,
  type MCPServerConfig,
  type AgentIdentity,
  type ToolChoice,
} from './protocol';

export { findBinaryPath, isBinaryAvailable, getPlatformId, type PlatformId } from './binary';
