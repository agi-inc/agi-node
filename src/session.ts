/**
 * Session class representing an AGI agent session
 */

import type { HTTPClient } from './http';
import type {
  SessionResponse,
  ExecuteStatusResponse,
  MessagesResponse,
  SSEEvent,
  NavigateResponse,
  ScreenshotResponse,
  SuccessResponse,
  DeleteResponse,
  MessageOptions,
  RunTaskOptions,
  StreamOptions,
} from './types';
import { AgentExecutionError } from './errors';
import { getField } from './utils';

/**
 * Session class providing all session-related operations
 *
 * @example
 * ```typescript
 * const session = await client.createSession('agi-0');
 *
 * try {
 *   const result = await session.runTask('Find cheapest iPhone 15...');
 *   console.log(result);
 * } finally {
 *   await session.delete();
 * }
 * ```
 */
export class Session {
  /** Session UUID */
  readonly sessionId: string;
  /** VNC URL for browser access */
  readonly vncUrl?: string;
  /** Agent service URL */
  readonly agentUrl?: string;
  /** Agent name */
  readonly agentName: string;
  /** Session status */
  status: string;
  /** Creation timestamp */
  readonly createdAt: string;
  /** Environment ID for snapshots */
  readonly environmentId?: string;

  constructor(
    private readonly http: HTTPClient,
    data: SessionResponse
  ) {
    // Handle both camelCase and snake_case API responses
    this.sessionId = getField(data, 'sessionId', 'session_id')!;
    this.vncUrl = getField(data, 'vncUrl', 'vnc_url');
    this.agentUrl = getField(data, 'agentUrl', 'agent_url');
    this.agentName = getField(data, 'agentName', 'agent_name')!;
    this.status = data.status;
    this.createdAt = getField(data, 'createdAt', 'created_at')!;
    this.environmentId = getField(data, 'environmentId', 'environment_id');
  }

  /**
   * Run a task and wait for completion (high-level API)
   *
   * @param task - Natural language task description
   * @param options - Optional task options
   * @returns Task result data
   *
   * @example
   * ```typescript
   * const result = await session.runTask(
   *   'Find the cheapest iPhone 15 Pro on Amazon, Best Buy, and Apple Store'
   * );
   * ```
   */
  async runTask(task: string, options?: RunTaskOptions): Promise<any> {
    // Send the task message
    await this.sendMessage(task, options);

    let lastResult: any = null;
    let eventCount = 0;
    const startTime = Date.now();
    const timeout = 60000; // 60 second timeout for receiving events

    // Stream events until task completion
    // Only stream new events, not history
    for await (const event of this.streamEvents({ includeHistory: false })) {
      eventCount++;

      // Capture the last result from question or done events
      if (event.event === 'question' || event.event === 'done') {
        lastResult = event.data;
      }

      if (event.event === 'done') {
        return event.data;
      }
      if (event.event === 'error') {
        throw new AgentExecutionError(
          `Task failed: ${JSON.stringify(event.data)}`,
          event.data
        );
      }

      // If we got a question and no more events for a bit, that might be the answer
      if (event.event === 'question') {
        // Wait a short time to see if more events come
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if task is finished
        const status = await this.getStatus();
        if (status.status === 'finished' || status.status === 'waiting_for_input') {
          return lastResult;
        }
      }

      // Timeout check
      if (Date.now() - startTime > timeout) {
        if (lastResult) {
          return lastResult;
        }
        throw new AgentExecutionError('Task timed out waiting for completion');
      }
    }

    // If stream ended but we got a result, return that
    if (lastResult) {
      return lastResult;
    }

    throw new AgentExecutionError('Event stream ended without task completion');
  }

  /**
   * Send a message to the agent
   *
   * @param message - Message content
   * @param options - Optional message options
   */
  async sendMessage(message: string, options?: MessageOptions): Promise<SuccessResponse> {
    return this.http.request<SuccessResponse>(
      'POST',
      `/v1/sessions/${this.sessionId}/message`,
      {
        json: {
          message,
          start_url: options?.startUrl,
          config_updates: options?.configUpdates,
        },
      }
    );
  }

  /**
   * Get current execution status
   *
   * @returns Execution status response
   */
  async getStatus(): Promise<ExecuteStatusResponse> {
    const status = await this.http.request<ExecuteStatusResponse>(
      'GET',
      `/v1/sessions/${this.sessionId}/status`
    );

    // Update local status
    this.status = status.status;

    return status;
  }

  /**
   * Get message history
   *
   * @param afterId - Only return messages after this ID
   * @param sanitize - Whether to sanitize message content
   * @returns Messages response
   */
  async getMessages(afterId?: number, sanitize = true): Promise<MessagesResponse> {
    const query: Record<string, string> = {
      sanitize: String(sanitize),
    };

    if (afterId !== undefined) {
      query.after_id = String(afterId);
    }

    const response = await this.http.request<any>('GET', `/v1/sessions/${this.sessionId}/messages`, {
      query,
    });

    // Handle snake_case response from API
    return {
      messages: response.messages || [],
      status: response.status,
      hasAgent: getField(response, 'hasAgent', 'has_agent') ?? false,
    };
  }

  /**
   * Stream real-time events from the session
   *
   * @param options - Stream options
   * @yields Server-Sent Events
   *
   * @example
   * ```typescript
   * for await (const event of session.streamEvents()) {
   *   if (event.event === 'thought') {
   *     console.log('Agent thinking:', event.data);
   *   }
   *   if (event.event === 'done') {
   *     console.log('Task completed:', event.data);
   *     break;
   *   }
   * }
   * ```
   */
  async *streamEvents(options?: StreamOptions): AsyncGenerator<SSEEvent> {
    const query: Record<string, string> = {
      sanitize: String(options?.sanitize ?? true),
      include_history: String(options?.includeHistory ?? true),
    };

    if (options?.eventTypes) {
      query.event_types = options.eventTypes.join(',');
    }

    yield* this.http.streamEvents(`/v1/sessions/${this.sessionId}/events`, query);
  }

  /**
   * Pause session execution
   */
  async pause(): Promise<SuccessResponse> {
    return this.http.request<SuccessResponse>('POST', `/v1/sessions/${this.sessionId}/pause`);
  }

  /**
   * Resume paused session
   */
  async resume(): Promise<SuccessResponse> {
    return this.http.request<SuccessResponse>('POST', `/v1/sessions/${this.sessionId}/resume`);
  }

  /**
   * Cancel running session
   */
  async cancel(): Promise<SuccessResponse> {
    return this.http.request<SuccessResponse>('POST', `/v1/sessions/${this.sessionId}/cancel`);
  }

  /**
   * Navigate browser to a URL
   *
   * @param url - URL to navigate to
   */
  async navigate(url: string): Promise<NavigateResponse> {
    const response = await this.http.request<any>('POST', `/v1/sessions/${this.sessionId}/navigate`, {
      json: { url },
    });

    // Handle snake_case response from API
    return {
      currentUrl: getField(response, 'currentUrl', 'current_url')!,
    };
  }

  /**
   * Take a screenshot of the current browser state
   *
   * @returns Screenshot response with base64 image data
   */
  async screenshot(): Promise<ScreenshotResponse> {
    return this.http.request<ScreenshotResponse>('GET', `/v1/sessions/${this.sessionId}/screenshot`);
  }

  /**
   * Delete the session
   *
   * @param saveSnapshotMode - Whether to save environment snapshot
   */
  async delete(saveSnapshotMode?: 'filesystem'): Promise<DeleteResponse> {
    const query: Record<string, string> = {};

    if (saveSnapshotMode) {
      query.save_snapshot_mode = saveSnapshotMode;
    }

    return this.http.request<DeleteResponse>('DELETE', `/v1/sessions/${this.sessionId}`, {
      query,
    });
  }
}
