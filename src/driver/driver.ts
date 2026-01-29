/**
 * AgentDriver - Spawns and manages the agi-driver binary.
 *
 * The driver communicates via JSON lines over stdin/stdout and provides
 * an event-based interface for agent control.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { createInterface, Interface } from 'readline';
import { findBinaryPath } from './binary';
import {
  DriverEvent,
  DriverState,
  DriverAction,
  StartCommand,
  ScreenshotCommand,
  StopCommand,
  ConfirmResponseCommand,
  AnswerCommand,
  parseEvent,
  serializeCommand,
  FinishedEvent,
  ErrorEvent,
} from './protocol';

/**
 * Options for creating an AgentDriver.
 */
export interface DriverOptions {
  /** Path to the agi-driver binary. If not provided, will be auto-detected. */
  binaryPath?: string;
  /** Model to use (default: 'claude-sonnet') */
  model?: string;
  /** Platform type (default: 'desktop') */
  platform?: 'desktop' | 'android';
  /** Environment variables to pass to the driver process */
  env?: Record<string, string>;
}

/**
 * Result from running the driver.
 */
export interface DriverResult {
  /** Whether the task completed successfully */
  success: boolean;
  /** Reason for completion */
  reason: string;
  /** Summary of what was accomplished */
  summary: string;
  /** Final step number */
  step: number;
}

/**
 * AgentDriver manages the lifecycle of the agi-driver binary.
 *
 * @example
 * ```typescript
 * const driver = new AgentDriver();
 *
 * driver.on('action', async (action) => {
 *   // Execute the action on the local machine
 *   await executeAction(action);
 *   // Send next screenshot
 *   driver.sendScreenshot(captureScreenshot());
 * });
 *
 * driver.on('thinking', (text) => {
 *   console.log('Agent thinking:', text);
 * });
 *
 * driver.on('confirm', async (reason) => {
 *   // Ask user for confirmation
 *   return await askUser(reason);
 * });
 *
 * const result = await driver.start('Open calculator and compute 2+2');
 * console.log('Done:', result.summary);
 * ```
 */
export class AgentDriver extends EventEmitter {
  private readonly binaryPath: string;
  private readonly model: string;
  private readonly platform: 'desktop' | 'android';
  private readonly env: Record<string, string>;

  private process: ChildProcess | null = null;
  private readline: Interface | null = null;
  private state: DriverState = 'idle';
  private step = 0;
  private sessionId = '';

  private resolveStart: ((result: DriverResult) => void) | null = null;
  private rejectStart: ((error: Error) => void) | null = null;

  // Pending callbacks for user interaction
  private pendingConfirm: ((approved: boolean, message?: string) => void) | null = null;
  private pendingAnswer: ((text: string) => void) | null = null;

  constructor(options: DriverOptions = {}) {
    super();
    this.binaryPath = options.binaryPath ?? findBinaryPath();
    this.model = options.model ?? 'claude-sonnet';
    this.platform = options.platform ?? 'desktop';
    this.env = options.env ?? {};
  }

  /**
   * Get the current state of the driver.
   */
  get currentState(): DriverState {
    return this.state;
  }

  /**
   * Get the current step number.
   */
  get currentStep(): number {
    return this.step;
  }

  /**
   * Check if the driver is running.
   */
  get isRunning(): boolean {
    return this.state === 'running';
  }

  /**
   * Check if the driver is waiting for user input.
   */
  get isWaiting(): boolean {
    return this.state === 'waiting_confirmation' || this.state === 'waiting_answer';
  }

  /**
   * Start the agent with a goal.
   *
   * @param goal - The task for the agent to accomplish
   * @param screenshot - Initial screenshot (base64-encoded)
   * @param screenWidth - Screen width in pixels
   * @param screenHeight - Screen height in pixels
   * @returns Promise that resolves when the agent finishes
   */
  async start(
    goal: string,
    screenshot: string,
    screenWidth: number,
    screenHeight: number
  ): Promise<DriverResult> {
    if (this.process) {
      throw new Error('Driver is already running');
    }

    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    return new Promise((resolve, reject) => {
      this.resolveStart = resolve;
      this.rejectStart = reject;

      // Spawn the driver process
      this.process = spawn(this.binaryPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...this.env,
        },
      });

      // Handle process errors
      this.process.on('error', (err) => {
        this.cleanup();
        if (this.rejectStart) {
          this.rejectStart(err);
          this.rejectStart = null;
          this.resolveStart = null;
        }
      });

      this.process.on('exit', (code) => {
        this.cleanup();
        if (this.rejectStart) {
          this.rejectStart(new Error(`Driver exited with code ${code}`));
          this.rejectStart = null;
          this.resolveStart = null;
        }
      });

      // Set up readline for stdout
      this.readline = createInterface({
        input: this.process.stdout!,
        crlfDelay: Infinity,
      });

      this.readline.on('line', (line) => {
        this.handleLine(line).catch((err) => {
          this.emit('error', {
            event: 'error',
            message: `Error handling line: ${err.message}`,
            code: 'parse_error',
            recoverable: false,
            step: this.step,
          });
        });
      });

      // Forward stderr
      this.process.stderr?.on('data', (data) => {
        this.emit('stderr', data.toString());
      });

      // Wait for ready event before sending start command
      this.once('ready', () => {
        const startCmd: StartCommand = {
          command: 'start',
          session_id: this.sessionId,
          goal,
          screenshot,
          screen_width: screenWidth,
          screen_height: screenHeight,
          platform: this.platform,
          model: this.model,
        };
        this.sendCommand(startCmd);
      });
    });
  }

  /**
   * Send a new screenshot to the driver.
   *
   * @param screenshot - Base64-encoded screenshot
   * @param screenWidth - Screen width in pixels
   * @param screenHeight - Screen height in pixels
   */
  sendScreenshot(screenshot: string, screenWidth?: number, screenHeight?: number): void {
    if (!this.process) {
      throw new Error('Driver is not running');
    }

    const cmd: ScreenshotCommand = {
      command: 'screenshot',
      data: screenshot,
      screen_width: screenWidth ?? 0,
      screen_height: screenHeight ?? 0,
    };
    this.sendCommand(cmd);
  }

  /**
   * Pause the driver.
   */
  pause(): void {
    if (!this.process) return;
    this.sendCommand({ command: 'pause' });
  }

  /**
   * Resume the driver.
   */
  resume(): void {
    if (!this.process) return;
    this.sendCommand({ command: 'resume' });
  }

  /**
   * Stop the driver.
   *
   * @param reason - Reason for stopping
   */
  async stop(reason?: string): Promise<void> {
    if (!this.process) return;

    const cmd: StopCommand = {
      command: 'stop',
      reason,
    };
    this.sendCommand(cmd);

    // Wait for process to exit
    await new Promise<void>((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }
      this.process.once('exit', () => resolve());
      // Give it a second to exit gracefully
      setTimeout(() => {
        if (this.process) {
          this.process.kill();
        }
        resolve();
      }, 1000);
    });

    this.cleanup();
  }

  /**
   * Respond to a confirmation request.
   *
   * @param approved - Whether the action is approved
   * @param message - Optional message to send with the response
   */
  respondConfirm(approved: boolean, message?: string): void {
    if (!this.process || this.state !== 'waiting_confirmation') {
      throw new Error('Not waiting for confirmation');
    }

    const cmd: ConfirmResponseCommand = {
      command: 'confirm',
      approved,
      message,
    };
    this.sendCommand(cmd);

    if (this.pendingConfirm) {
      this.pendingConfirm(approved, message);
      this.pendingConfirm = null;
    }
  }

  /**
   * Respond to a question.
   *
   * @param text - The answer text
   * @param questionId - Optional question ID
   */
  respondAnswer(text: string, questionId?: string): void {
    if (!this.process || this.state !== 'waiting_answer') {
      throw new Error('Not waiting for answer');
    }

    const cmd: AnswerCommand = {
      command: 'answer',
      text,
      question_id: questionId,
    };
    this.sendCommand(cmd);

    if (this.pendingAnswer) {
      this.pendingAnswer(text);
      this.pendingAnswer = null;
    }
  }

  private sendCommand(cmd: object): void {
    if (!this.process?.stdin) return;
    const line = serializeCommand(cmd as any) + '\n';
    this.process.stdin.write(line);
  }

  private async handleLine(line: string): Promise<void> {
    if (!line.trim()) return;

    let event: DriverEvent;
    try {
      event = parseEvent(line);
    } catch (e) {
      console.error('Failed to parse event:', line);
      return;
    }

    this.step = event.step;

    // Emit raw event
    this.emit('event', event);

    // Handle specific event types
    switch (event.event) {
      case 'ready':
        this.emit('ready', event);
        break;

      case 'state_change':
        this.state = event.state;
        this.emit('state_change', event.state, event);
        break;

      case 'thinking':
        this.emit('thinking', event.text, event);
        break;

      case 'action':
        this.emit('action', event.action, event);
        break;

      case 'confirm':
        this.state = 'waiting_confirmation';
        // Try to get response from listener
        const confirmListeners = this.listeners('confirm');
        if (confirmListeners.length > 0) {
          try {
            const approved = await (confirmListeners[0] as any)(event.reason, event);
            if (typeof approved === 'boolean') {
              this.respondConfirm(approved);
            }
          } catch {
            // Listener didn't respond, wait for manual response
          }
        }
        break;

      case 'ask_question':
        this.state = 'waiting_answer';
        // Try to get response from listener
        const questionListeners = this.listeners('ask_question');
        if (questionListeners.length > 0) {
          try {
            const answer = await (questionListeners[0] as any)(event.question, event);
            if (typeof answer === 'string') {
              this.respondAnswer(answer, event.question_id);
            }
          } catch {
            // Listener didn't respond, wait for manual response
          }
        }
        break;

      case 'finished':
        this.handleFinished(event);
        break;

      case 'error':
        this.handleError(event);
        break;
    }
  }

  private handleFinished(event: FinishedEvent): void {
    this.state = 'finished';
    this.emit('finished', event);

    if (this.resolveStart) {
      this.resolveStart({
        success: event.success,
        reason: event.reason,
        summary: event.summary,
        step: event.step,
      });
      this.resolveStart = null;
      this.rejectStart = null;
    }

    this.cleanup();
  }

  private handleError(event: ErrorEvent): void {
    this.emit('error', event);

    if (!event.recoverable) {
      this.state = 'error';
      if (this.rejectStart) {
        this.rejectStart(new Error(`${event.code}: ${event.message}`));
        this.rejectStart = null;
        this.resolveStart = null;
      }
      this.cleanup();
    }
  }

  private cleanup(): void {
    if (this.readline) {
      this.readline.close();
      this.readline = null;
    }
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.pendingConfirm = null;
    this.pendingAnswer = null;
  }
}
