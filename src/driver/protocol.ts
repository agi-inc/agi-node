/**
 * Protocol types for driver communication.
 *
 * The driver communicates via JSON lines:
 * - Events are emitted on stdout (driver -> SDK)
 * - Commands are sent on stdin (SDK -> driver)
 */

// Event types
export type EventType =
  | 'ready'
  | 'state_change'
  | 'thinking'
  | 'action'
  | 'confirm'
  | 'ask_question'
  | 'finished'
  | 'error'
  | 'screenshot_captured'
  | 'session_created'
  | 'audio_transcript'
  | 'video_frame'
  | 'speech_started'
  | 'speech_finished'
  | 'turn_detected';

// Command types
export type CommandType =
  | 'start'
  | 'screenshot'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'confirm'
  | 'answer'
  | 'get_audio_transcript'
  | 'get_video_frame';

// Driver states
export type DriverState =
  | 'idle'
  | 'running'
  | 'paused'
  | 'waiting_confirmation'
  | 'waiting_answer'
  | 'finished'
  | 'stopped'
  | 'error';

// Base event interface
export interface BaseEvent {
  event: EventType;
  step: number;
}

export interface ReadyEvent extends BaseEvent {
  event: 'ready';
  version: string;
  protocol: string;
}

export interface StateChangeEvent extends BaseEvent {
  event: 'state_change';
  state: DriverState;
}

export interface ThinkingEvent extends BaseEvent {
  event: 'thinking';
  text: string;
}

export interface ActionEvent extends BaseEvent {
  event: 'action';
  action: DriverAction;
}

export interface ConfirmEvent extends BaseEvent {
  event: 'confirm';
  action: DriverAction;
  reason: string;
}

export interface AskQuestionEvent extends BaseEvent {
  event: 'ask_question';
  question: string;
  question_id: string;
}

export interface FinishedEvent extends BaseEvent {
  event: 'finished';
  reason: string;
  summary: string;
  success: boolean;
}

export interface ErrorEvent extends BaseEvent {
  event: 'error';
  message: string;
  code: string;
  recoverable: boolean;
}

/**
 * Emitted in local mode when the driver captures a screenshot.
 * Lightweight notification (no image data).
 */
export interface ScreenshotCapturedEvent extends BaseEvent {
  event: 'screenshot_captured';
  width: number;
  height: number;
}

/**
 * Emitted after the driver creates an API session.
 */
export interface SessionCreatedEvent extends BaseEvent {
  event: 'session_created';
  session_id: string;
  agent_url: string;
  environment_url?: string;
  vnc_url?: string;
}

/**
 * Emitted when audio transcript is available.
 */
export interface AudioTranscriptEvent extends BaseEvent {
  event: 'audio_transcript';
  transcript: string;
  seconds_ago: number;
  duration: number;
}

/**
 * Emitted when video frame is available.
 */
export interface VideoFrameEvent extends BaseEvent {
  event: 'video_frame';
  frame_base64: string;
  source: 'camera' | 'screen';
  seconds_ago: number;
}

/**
 * Emitted when TTS speech starts playing.
 */
export interface SpeechStartedEvent extends BaseEvent {
  event: 'speech_started';
  text: string;
}

/**
 * Emitted when TTS speech finishes playing.
 */
export interface SpeechFinishedEvent extends BaseEvent {
  event: 'speech_finished';
}

/**
 * Emitted when turn detection detects user has stopped speaking.
 */
export interface TurnDetectedEvent extends BaseEvent {
  event: 'turn_detected';
  transcript: string;
}

export type DriverEvent =
  | ReadyEvent
  | StateChangeEvent
  | ThinkingEvent
  | ActionEvent
  | ConfirmEvent
  | AskQuestionEvent
  | FinishedEvent
  | ErrorEvent
  | ScreenshotCapturedEvent
  | SessionCreatedEvent
  | AudioTranscriptEvent
  | VideoFrameEvent
  | SpeechStartedEvent
  | SpeechFinishedEvent
  | TurnDetectedEvent;

// Action type from the driver
export interface DriverAction {
  type: string;
  x?: number;
  y?: number;
  [key: string]: unknown;
}

// MCP server configuration
export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

// Agent identity
export interface AgentIdentity {
  name: string;
  creator: string;
  creator_url: string;
}

// Tool choice configuration
export type ToolChoice =
  | 'auto'
  | 'required'
  | 'none'
  | { type: 'tool'; name: string };

// Base command interface
export interface BaseCommand {
  command: CommandType;
}

export interface StartCommand extends BaseCommand {
  command: 'start';
  session_id: string;
  goal: string;
  screenshot: string;
  screen_width: number;
  screen_height: number;
  platform: 'desktop' | 'android';
  model: string;
  mode: '' | 'local' | 'remote';
  agent_name: string;
  api_url?: string;
  environment_type?: string;

  // Multimodal features
  agent_identity?: AgentIdentity;
  tool_choice?: ToolChoice;
  mcp_servers?: MCPServerConfig[];
  audio_input_enabled?: boolean;
  audio_buffer_seconds?: number;
  turn_detection_enabled?: boolean;
  turn_detection_silence_ms?: number;
  speech_output_enabled?: boolean;
  speech_voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  camera_enabled?: boolean;
  camera_buffer_seconds?: number;
  screen_recording_enabled?: boolean;
  screen_recording_buffer_seconds?: number;
}

export interface ScreenshotCommand extends BaseCommand {
  command: 'screenshot';
  data: string;
  screen_width: number;
  screen_height: number;
}

export interface PauseCommand extends BaseCommand {
  command: 'pause';
}

export interface ResumeCommand extends BaseCommand {
  command: 'resume';
}

export interface StopCommand extends BaseCommand {
  command: 'stop';
  reason: string;
}

export interface ConfirmResponseCommand extends BaseCommand {
  command: 'confirm';
  approved: boolean;
  message: string;
}

export interface AnswerCommand extends BaseCommand {
  command: 'answer';
  text: string;
  question_id: string;
}

export interface GetAudioTranscriptCommand extends BaseCommand {
  command: 'get_audio_transcript';
  seconds_ago: number;
  duration: number;
}

export interface GetVideoFrameCommand extends BaseCommand {
  command: 'get_video_frame';
  source: 'camera' | 'screen';
  seconds_ago: number;
}

export type DriverCommand =
  | StartCommand
  | ScreenshotCommand
  | PauseCommand
  | ResumeCommand
  | StopCommand
  | ConfirmResponseCommand
  | AnswerCommand
  | GetAudioTranscriptCommand
  | GetVideoFrameCommand;
