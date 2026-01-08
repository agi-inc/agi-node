/**
 * Session context manager for high-level API
 */

import type { AGIClient } from '../client';
import type {
  TaskResult,
  TaskMetadata,
  ExecuteStatusResponse,
  MessagesResponse,
  NavigateResponse,
  SSEEvent,
  SuccessResponse,
} from '../types';
import { Screenshot } from '../types/screenshot';
import { AgentExecutionError } from '../errors';

/**
 * High-level session context manager with automatic cleanup
 *
 * Use with `await using` for automatic session deletion:
 *
 * @example
 * ```typescript
 * await using session = client.session('agi-0');
 * const result = await session.runTask('Find flights...');
 * // Session automatically deleted
 * ```
 */
export class SessionContext {
  public sessionId?: string;
  public vncUrl?: string;
  public agentUrl?: string;

  constructor(
    private readonly client: AGIClient,
    private readonly agentName: string = 'agi-0',
    private readonly createOptions?: {
      webhookUrl?: string;
      goal?: string;
      maxSteps?: number;
      restoreFromEnvironmentId?: string;
    }
  ) {}

  /**
   * Automatic cleanup via explicit resource management
   */
  async [Symbol.asyncDispose](): Promise<void> {
    if (this.sessionId) {
      try {
        await this.client.sessions.delete(this.sessionId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Ensure session is created
   */
  private async ensureSession(): Promise<void> {
    if (this.sessionId) return;

    const response = await this.client.sessions.create(this.agentName, this.createOptions);
    this.sessionId = response.sessionId;
    this.vncUrl = response.vncUrl;
    this.agentUrl = response.agentUrl;
  }

  /**
   * Run a task and wait for completion using HTTP polling
   *
   * This method uses HTTP polling instead of SSE streaming for better reliability
   * with long-running tasks and network instability.
   *
   * @param task - Natural language task description
   * @param options - Task execution options
   * @returns TaskResult with data and execution metadata
   *
   * @example
   * ```typescript
   * const result = await session.runTask(
   *   'Find cheapest iPhone 15 Pro',
   *   { timeout: 300000, pollInterval: 2000 } // 5 min timeout, 2s polling
   * );
   * console.log(result.data);
   * console.log(`Took ${result.metadata.duration}s, ${result.metadata.steps} steps`);
   * ```
   */
  async runTask(
    task: string,
    options?: {
      startUrl?: string;
      timeout?: number;
      pollInterval?: number;
    }
  ): Promise<TaskResult> {
    await this.ensureSession();
    if (!this.sessionId) throw new Error('Session not created');

    const timeout = options?.timeout ?? 600000; // 10 minutes
    const pollInterval = options?.pollInterval ?? 3000; // 3 seconds

    await this.client.sessions.sendMessage(this.sessionId, task, {
      startUrl: options?.startUrl,
    });

    const startTime = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const elapsed = Date.now() - startTime;

      if (elapsed > timeout) {
        throw new AgentExecutionError(
          `Task exceeded timeout of ${timeout}ms (elapsed: ${elapsed}ms)`
        );
      }

      const statusResponse = await this.client.sessions.getStatus(this.sessionId);

      if (statusResponse.status === 'finished' || statusResponse.status === 'waiting_for_input') {
        const messagesResponse = await this.client.sessions.getMessages(this.sessionId);
        const messages = messagesResponse.messages;

        const doneMsg = messages.find((msg) => msg.type === 'DONE' || msg.type === 'QUESTION');

        if (!doneMsg) {
          throw new AgentExecutionError(
            `Task status '${statusResponse.status}' but no DONE/QUESTION message found`
          );
        }

        const content = doneMsg.content;
        const data =
          typeof content === 'object' && content !== null ? content : { content: content ?? {} };

        const duration = (Date.now() - startTime) / 1000;
        const steps = messages.filter((msg) =>
          ['THOUGHT', 'QUESTION', 'DONE'].includes(msg.type)
        ).length;

        const metadata: TaskMetadata = {
          taskId: doneMsg.id,
          sessionId: this.sessionId,
          duration,
          cost: 0.0,
          timestamp: new Date(),
          steps,
          success: true,
        };

        return { data, metadata };
      }

      if (statusResponse.status === 'error') {
        const messagesResponse = await this.client.sessions.getMessages(this.sessionId);
        const errorMsg = messagesResponse.messages.find((msg) => msg.type === 'ERROR');
        const errorDetails = errorMsg
          ? typeof errorMsg.content === 'string'
            ? errorMsg.content
            : JSON.stringify(errorMsg.content)
          : 'Unknown error';

        throw new AgentExecutionError(`Task failed: ${errorDetails}`);
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * Send a message to the agent
   *
   * @param message - Message content
   * @param options - Message options
   * @returns SuccessResponse confirming message was sent
   *
   * @example
   * ```typescript
   * await session.sendMessage('Find flights from SFO to JFK under $450');
   * ```
   */
  async sendMessage(
    message: string,
    options?: {
      startUrl?: string;
      configUpdates?: Record<string, unknown>;
    }
  ): Promise<SuccessResponse> {
    await this.ensureSession();
    if (!this.sessionId) throw new Error('Session not created');
    return this.client.sessions.sendMessage(this.sessionId, message, options);
  }

  /**
   * Get current execution status
   *
   * @returns ExecuteStatusResponse with status
   *
   * @example
   * ```typescript
   * const status = await session.getStatus();
   * console.log(status.status);
   * ```
   */
  async getStatus(): Promise<ExecuteStatusResponse> {
    await this.ensureSession();
    if (!this.sessionId) throw new Error('Session not created');
    return this.client.sessions.getStatus(this.sessionId);
  }

  /**
   * Get messages from the session
   *
   * @param afterId - Return messages with ID > afterId (for polling)
   * @param sanitize - Filter out system messages, prompts, and images
   * @returns MessagesResponse with messages list and status
   *
   * @example
   * ```typescript
   * const messages = await session.getMessages(0);
   * for (const msg of messages.messages) {
   *   console.log(`[${msg.type}] ${msg.content}`);
   * }
   * ```
   */
  async getMessages(afterId?: number, sanitize: boolean = true): Promise<MessagesResponse> {
    await this.ensureSession();
    if (!this.sessionId) throw new Error('Session not created');
    return this.client.sessions.getMessages(this.sessionId, afterId, sanitize);
  }

  /**
   * Stream real-time events from the session via Server-Sent Events
   *
   * @param options - Stream options
   * @yields SSEEvent objects
   *
   * @example
   * ```typescript
   * for await (const event of session.streamEvents()) {
   *   if (event.event === 'thought') {
   *     console.log('Agent:', event.data);
   *   }
   *   if (event.event === 'done') {
   *     console.log('Result:', event.data);
   *     break;
   *   }
   * }
   * ```
   */
  async *streamEvents(options?: {
    eventTypes?: string[];
    sanitize?: boolean;
    includeHistory?: boolean;
  }): AsyncGenerator<SSEEvent> {
    await this.ensureSession();
    if (!this.sessionId) throw new Error('Session not created');
    yield* this.client.sessions.streamEvents(this.sessionId, options);
  }

  /**
   * Pause task execution
   *
   * @returns SuccessResponse confirming pause
   *
   * @example
   * ```typescript
   * await session.pause();
   * ```
   */
  async pause(): Promise<SuccessResponse> {
    await this.ensureSession();
    if (!this.sessionId) throw new Error('Session not created');
    return this.client.sessions.pause(this.sessionId);
  }

  /**
   * Resume paused task
   *
   * @returns SuccessResponse confirming resume
   *
   * @example
   * ```typescript
   * await session.resume();
   * ```
   */
  async resume(): Promise<SuccessResponse> {
    await this.ensureSession();
    if (!this.sessionId) throw new Error('Session not created');
    return this.client.sessions.resume(this.sessionId);
  }

  /**
   * Cancel task execution
   *
   * @returns SuccessResponse confirming cancellation
   *
   * @example
   * ```typescript
   * await session.cancel();
   * ```
   */
  async cancel(): Promise<SuccessResponse> {
    await this.ensureSession();
    if (!this.sessionId) throw new Error('Session not created');
    return this.client.sessions.cancel(this.sessionId);
  }

  /**
   * Navigate browser to URL
   *
   * @param url - URL to navigate to
   * @returns NavigateResponse with current URL
   *
   * @example
   * ```typescript
   * await session.navigate('https://amazon.com');
   * ```
   */
  async navigate(url: string): Promise<NavigateResponse> {
    await this.ensureSession();
    if (!this.sessionId) throw new Error('Session not created');
    return this.client.sessions.navigate(this.sessionId, url);
  }

  /**
   * Get browser screenshot
   *
   * @returns Screenshot with decoded image data and save() method
   *
   * @example
   * ```typescript
   * const screenshot = await session.screenshot();
   * await screenshot.save('page.png');
   * console.log(`Size: ${screenshot.width}x${screenshot.height}`);
   * ```
   */
  async screenshot(): Promise<Screenshot> {
    await this.ensureSession();
    if (!this.sessionId) throw new Error('Session not created');
    const response = await this.client.sessions.screenshot(this.sessionId);
    return Screenshot.fromBase64(response.screenshot, response.url, response.title);
  }
}
