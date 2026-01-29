/**
 * Event emitter for driver events.
 */

import { EventEmitter } from 'events';
import type {
  DriverEvent,
  DriverAction,
  DriverState,
  ThinkingEvent,
  ActionEvent,
  ConfirmEvent,
  AskQuestionEvent,
  FinishedEvent,
  ErrorEvent,
  StateChangeEvent,
  ReadyEvent,
} from './protocol';

/**
 * Typed event emitter for driver events.
 */
export interface DriverEventEmitter {
  on(event: 'ready', listener: (event: ReadyEvent) => void): this;
  on(event: 'state_change', listener: (state: DriverState, event: StateChangeEvent) => void): this;
  on(event: 'thinking', listener: (text: string, event: ThinkingEvent) => void): this;
  on(event: 'action', listener: (action: DriverAction, event: ActionEvent) => void): this;
  on(event: 'confirm', listener: (reason: string, event: ConfirmEvent) => Promise<boolean>): this;
  on(event: 'ask_question', listener: (question: string, event: AskQuestionEvent) => Promise<string>): this;
  on(event: 'finished', listener: (event: FinishedEvent) => void): this;
  on(event: 'error', listener: (event: ErrorEvent) => void): this;
  on(event: 'event', listener: (event: DriverEvent) => void): this;

  once(event: 'ready', listener: (event: ReadyEvent) => void): this;
  once(event: 'state_change', listener: (state: DriverState, event: StateChangeEvent) => void): this;
  once(event: 'finished', listener: (event: FinishedEvent) => void): this;
  once(event: 'error', listener: (event: ErrorEvent) => void): this;
  once(event: 'event', listener: (event: DriverEvent) => void): this;

  off(event: string, listener: (...args: unknown[]) => void): this;
  removeAllListeners(event?: string): this;
}

/**
 * Create a typed event emitter for driver events.
 */
export function createDriverEventEmitter(): DriverEventEmitter & EventEmitter {
  return new EventEmitter() as DriverEventEmitter & EventEmitter;
}
