/**
 * Async event loop manager for client-driven sessions.
 */

import type { AGIClient } from './client';
import type { DesktopAction, StepDesktopResponse } from './types';

/**
 * State of the agent execution loop.
 */
export type LoopState = 'idle' | 'running' | 'paused' | 'stopped' | 'finished';

/**
 * Callback type for capturing screenshots.
 * Should return a base64-encoded screenshot.
 */
export type CaptureScreenshotFn = () => Promise<string>;

/**
 * Callback type for executing actions.
 */
export type ExecuteActionsFn = (actions: DesktopAction[]) => Promise<void>;

/**
 * Callback type for handling thinking output.
 */
export type OnThinkingFn = (thinking: string) => void;

/**
 * Callback type for handling user questions.
 * Should return the user's answer.
 */
export type OnAskUserFn = (question: string) => Promise<string>;

/**
 * Callback type for step completion.
 */
export type OnStepFn = (step: number, response: StepDesktopResponse) => void;

/**
 * Options for creating an AgentLoop.
 */
export interface AgentLoopOptions {
  /** AGIClient instance */
  client: AGIClient;
  /** Agent service URL from session.agentUrl */
  agentUrl: string;
  /** Async callback that returns base64-encoded screenshot */
  captureScreenshot: CaptureScreenshotFn;
  /** Async callback that executes a list of actions */
  executeActions: ExecuteActionsFn;
  /** Optional callback for agent thinking/reasoning output */
  onThinking?: OnThinkingFn;
  /** Optional async callback to handle user questions. If not provided and agent asks a question, the loop will stop. */
  onAskUser?: OnAskUserFn;
  /** Optional callback called after each step with step number and full response */
  onStep?: OnStepFn;
  /** Optional delay in milliseconds between steps (default: 0) */
  stepDelay?: number;
}

/**
 * Async event loop manager for client-driven sessions.
 *
 * This class manages the execution loop for agent sessions where the client
 * is responsible for capturing screenshots and executing actions (e.g., desktop,
 * mobile, or any client-driven session type). It provides start/pause/resume/stop
 * control over the loop.
 *
 * The loop:
 * 1. Captures a screenshot using the provided callback
 * 2. Sends it to the agent via step()
 * 3. Executes returned actions using the provided callback
 * 4. Repeats until finished or stopped
 *
 * @example
 * ```typescript
 * import { AGIClient, AgentLoop } from 'agi-sdk';
 *
 * const client = new AGIClient({ apiKey: '...' });
 *
 * // Create client-driven session
 * const session = await client.sessions.create('agi-2-claude', {
 *   agentSessionType: 'desktop',
 *   goal: 'Open calculator and compute 2+2'
 * });
 *
 * // Create and run loop
 * const loop = new AgentLoop({
 *   client,
 *   agentUrl: session.agentUrl!,
 *   captureScreenshot: async () => {
 *     // Return base64-encoded screenshot
 *     return '...';
 *   },
 *   executeActions: async (actions) => {
 *     for (const action of actions) {
 *       console.log('Executing:', action);
 *     }
 *   },
 *   onThinking: (t) => console.log('Thinking:', t),
 * });
 *
 * const result = await loop.start();
 * console.log('Finished:', result.finished);
 * ```
 *
 * @example Pause/resume control
 * ```typescript
 * // Start loop without awaiting
 * const promise = loop.start();
 *
 * // Pause after 5 seconds
 * setTimeout(() => loop.pause(), 5000);
 *
 * // Resume after user input
 * process.stdin.once('data', () => loop.resume());
 *
 * // Wait for completion
 * const result = await promise;
 * ```
 */
export class AgentLoop {
  private readonly client: AGIClient;
  private readonly agentUrl: string;
  private readonly captureScreenshot: CaptureScreenshotFn;
  private readonly executeActions: ExecuteActionsFn;
  private readonly onThinking?: OnThinkingFn;
  private readonly onAskUser?: OnAskUserFn;
  private readonly onStep?: OnStepFn;
  private readonly stepDelay: number;

  private _state: LoopState = 'idle';
  private _lastResult: StepDesktopResponse | null = null;
  private _currentStep = 0;

  // Pause control using Promise-based approach
  private pauseResolve: (() => void) | null = null;
  private pausePromise: Promise<void> | null = null;

  constructor(options: AgentLoopOptions) {
    this.client = options.client;
    this.agentUrl = options.agentUrl;
    this.captureScreenshot = options.captureScreenshot;
    this.executeActions = options.executeActions;
    this.onThinking = options.onThinking;
    this.onAskUser = options.onAskUser;
    this.onStep = options.onStep;
    this.stepDelay = options.stepDelay ?? 0;
  }

  /** Current state of the loop. */
  get state(): LoopState {
    return this._state;
  }

  /** Current step number. */
  get currentStep(): number {
    return this._currentStep;
  }

  /** Last step result, if any. */
  get lastResult(): StepDesktopResponse | null {
    return this._lastResult;
  }

  /**
   * Start the execution loop.
   *
   * Runs the loop until the task is finished, stopped, or an unhandled
   * ask_user question is encountered.
   *
   * @param message - Optional initial message (goal or instruction).
   *   Usually not needed if goal was set during session creation.
   * @returns The final StepDesktopResponse
   * @throws Error if loop is already running
   */
  async start(message?: string): Promise<StepDesktopResponse> {
    if (this._state === 'running') {
      throw new Error('Loop is already running');
    }

    this._state = 'running';
    let currentMessage = message;
    let result: StepDesktopResponse | null = null;

    try {
      while (this._state === 'running') {
        // Wait if paused
        if (this.pausePromise) {
          await this.pausePromise;
        }

        // Check state after potential pause
        if (this._state !== 'running' && this._state !== 'paused') {
          break;
        }

        // If still paused, continue waiting
        if (this._state === 'paused') {
          continue;
        }

        // Capture screenshot
        const screenshot = await this.captureScreenshot();

        // Call step
        result = await this.client.sessions.step(this.agentUrl, screenshot, currentMessage);
        currentMessage = undefined; // Only send message on first call
        this._lastResult = result;
        this._currentStep = result.step;

        // Thinking callback
        if (result.thinking && this.onThinking) {
          this.onThinking(result.thinking);
        }

        // Step callback
        if (this.onStep) {
          this.onStep(result.step, result);
        }

        // Handle ask_user
        if (result.askUser) {
          if (this.onAskUser) {
            const answer = await this.onAskUser(result.askUser);
            currentMessage = answer;
          } else {
            // No handler, stop the loop
            this._state = 'stopped';
            return result;
          }
        }

        // Execute actions
        if (result.actions.length > 0) {
          await this.executeActions(result.actions);
        }

        // Check if done
        if (result.finished) {
          this._state = 'finished';
          return result;
        }

        // Optional delay between steps
        if (this.stepDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.stepDelay));
        }
      }
    } catch (error) {
      this._state = 'stopped';
      throw error;
    }

    // Return last result or create empty response
    if (result === null) {
      result = {
        actions: [],
        thinking: undefined,
        finished: true,
        askUser: undefined,
        step: this._currentStep,
      };
    }

    return result;
  }

  /**
   * Pause the execution loop.
   *
   * The loop will complete the current step before pausing.
   * Call resume() to continue.
   */
  pause(): void {
    if (this._state !== 'running') {
      return;
    }
    this._state = 'paused';
    this.pausePromise = new Promise((resolve) => {
      this.pauseResolve = resolve;
    });
  }

  /**
   * Resume a paused loop.
   */
  resume(): void {
    if (this._state !== 'paused') {
      return;
    }
    this._state = 'running';
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pauseResolve = null;
      this.pausePromise = null;
    }
  }

  /**
   * Stop the execution loop.
   *
   * The loop will complete the current step before stopping.
   */
  stop(): void {
    this._state = 'stopped';
    // Unblock if paused
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pauseResolve = null;
      this.pausePromise = null;
    }
  }

  /** Check if the loop is currently running. */
  isRunning(): boolean {
    return this._state === 'running';
  }

  /** Check if the loop is currently paused. */
  isPaused(): boolean {
    return this._state === 'paused';
  }

  /** Check if the loop has finished successfully. */
  isFinished(): boolean {
    return this._state === 'finished';
  }
}
