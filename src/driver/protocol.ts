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
  | 'session_created';

// Command types
export type CommandType =
  | 'start'
  | 'screenshot'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'confirm'
  | 'answer';

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
  | SessionCreatedEvent;

// Action type from the driver
export interface DriverAction {
  type: string;
  x?: number;
  y?: number;
  [key: string]: unknown;
}

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
  /** "local" for autonomous mode, "remote" for managed VM, "" for legacy SDK-driven mode */
  mode?: string;
  /** Agent name for the AGI API (e.g., "agi-2-claude") */
  agent_name?: string;
  /** AGI API base URL (default: "https://api.agi.tech") */
  api_url?: string;
  /** Environment type for remote mode ("ubuntu-1" or "chrome-1") */
  environment_type?: string;
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
  reason?: string;
}

export interface ConfirmResponseCommand extends BaseCommand {
  command: 'confirm';
  approved: boolean;
  message?: string;
}

export interface AnswerCommand extends BaseCommand {
  command: 'answer';
  text: string;
  question_id?: string;
}

export type DriverCommand =
  | StartCommand
  | ScreenshotCommand
  | PauseCommand
  | ResumeCommand
  | StopCommand
  | ConfirmResponseCommand
  | AnswerCommand;

/**
 * Parse a JSON line into a DriverEvent.
 */
export function parseEvent(line: string): DriverEvent {
  const data = JSON.parse(line);
  return data as DriverEvent;
}

/**
 * Serialize a command to a JSON line.
 */
export function serializeCommand(command: DriverCommand): string {
  return JSON.stringify(command);
}
