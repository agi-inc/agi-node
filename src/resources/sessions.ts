/**
 * Sessions API resource
 */

import type { HTTPClient } from '../http';
import type {
  SessionResponse,
  ExecuteStatusResponse,
  MessagesResponse,
  SuccessResponse,
  DeleteResponse,
  NavigateResponse,
  ScreenshotResponse,
  SSEEvent,
  SnapshotMode,
  StepDesktopResponse,
  ModelsResponse,
} from '../types';
import { normalizeSessionResponse } from '../utils';

/**
 * Sessions API resource providing all session-related operations
 */
export class SessionsResource {
  constructor(private readonly http: HTTPClient) {}

  // ===== SESSION MANAGEMENT =====

  /**
   * Create a new agent session
   *
   * @param agentName - Agent model to use (e.g., "agi-0", "agi-2-claude")
   * @param options - Session creation options
   * @returns SessionResponse with sessionId, vncUrl, agentUrl, status, etc.
   *
   * @example
   * ```typescript
   * // Standard browser session
   * const session = await client.sessions.create('agi-0', {
   *   webhookUrl: 'https://yourapp.com/webhook',
   *   maxSteps: 200
   * });
   *
   * // Desktop session (client-managed)
   * const session = await client.sessions.create('agi-2-claude', {
   *   agentSessionType: 'desktop',
   *   goal: 'Open calculator and compute 2+2'
   * });
   * console.log(session.sessionId); // Use with client.sessions.step()
   * ```
   */
  async create(
    agentName: string = 'agi-0',
    options?: {
      webhookUrl?: string;
      goal?: string;
      maxSteps?: number;
      restoreFromEnvironmentId?: string;
      agentSessionType?: string;
      cdpUrl?: string;
    }
  ): Promise<SessionResponse> {
    const payload: Record<string, unknown> = {
      agent_name: agentName,
      max_steps: options?.maxSteps ?? 100,
    };

    if (options?.webhookUrl) payload.webhook_url = options.webhookUrl;
    if (options?.goal) payload.goal = options.goal;
    if (options?.restoreFromEnvironmentId) {
      payload.restore_from_environment_id = options.restoreFromEnvironmentId;
    }
    if (options?.agentSessionType) {
      payload.agent_session_type = options.agentSessionType;
    }
    if (options?.cdpUrl) payload.cdp_url = options.cdpUrl;

    const response = await this.http.request<Record<string, unknown>>('POST', '/v1/sessions', {
      json: payload,
    });

    return normalizeSessionResponse(response);
  }

  /**
   * List all sessions for the authenticated user
   *
   * @returns Array of SessionResponse objects
   *
   * @example
   * ```typescript
   * const sessions = await client.sessions.list();
   * for (const session of sessions) {
   *   console.log(`${session.sessionId}: ${session.status}`);
   * }
   * ```
   */
  async list(): Promise<SessionResponse[]> {
    const responses = await this.http.request<Array<Record<string, unknown>>>(
      'GET',
      '/v1/sessions'
    );
    return responses.map(normalizeSessionResponse);
  }

  /**
   * Get details for a specific session
   *
   * @param sessionId - Session UUID
   * @returns SessionResponse with session details
   *
   * @example
   * ```typescript
   * const session = await client.sessions.get('session-uuid');
   * console.log(session.status);
   * ```
   */
  async get(sessionId: string): Promise<SessionResponse> {
    const response = await this.http.request<Record<string, unknown>>(
      'GET',
      `/v1/sessions/${sessionId}`
    );
    return normalizeSessionResponse(response);
  }

  /**
   * Delete a session and cleanup its resources
   *
   * @param sessionId - Session UUID
   * @param saveSnapshotMode - Snapshot mode: "none", "memory", or "filesystem"
   * @returns DeleteResponse confirming deletion
   *
   * @example
   * ```typescript
   * await client.sessions.delete('session-uuid', 'filesystem');
   * ```
   */
  async delete(
    sessionId: string,
    saveSnapshotMode: SnapshotMode = 'none'
  ): Promise<DeleteResponse> {
    return this.http.request<DeleteResponse>('DELETE', `/v1/sessions/${sessionId}`, {
      query: { save_snapshot_mode: saveSnapshotMode },
    });
  }

  /**
   * Delete all sessions for the authenticated user
   *
   * @returns DeleteResponse with count of deleted sessions
   *
   * @example
   * ```typescript
   * const result = await client.sessions.deleteAll();
   * console.log(result.message);
   * ```
   */
  async deleteAll(): Promise<DeleteResponse> {
    return this.http.request<DeleteResponse>('DELETE', '/v1/sessions');
  }

  // ===== AGENT INTERACTION =====

  /**
   * Send a message to the agent to start a task or respond to questions
   *
   * @param sessionId - Session UUID
   * @param message - Message content (task instruction or response)
   * @param options - Message options
   * @returns SuccessResponse confirming message was sent
   *
   * @example
   * ```typescript
   * await client.sessions.sendMessage(
   *   'session-uuid',
   *   'Find flights from SFO to JFK under $450'
   * );
   * ```
   */
  async sendMessage(
    sessionId: string,
    message: string,
    options?: {
      startUrl?: string;
      configUpdates?: Record<string, unknown>;
    }
  ): Promise<SuccessResponse> {
    return this.http.request<SuccessResponse>('POST', `/v1/sessions/${sessionId}/message`, {
      json: {
        message,
        start_url: options?.startUrl,
        config_updates: options?.configUpdates,
      },
    });
  }

  /**
   * Get the current execution status of a session
   *
   * @param sessionId - Session UUID
   * @returns ExecuteStatusResponse with status
   *
   * @example
   * ```typescript
   * const status = await client.sessions.getStatus('session-uuid');
   * if (status.status === 'finished') {
   *   console.log('Task completed!');
   * }
   * ```
   */
  async getStatus(sessionId: string): Promise<ExecuteStatusResponse> {
    return this.http.request<ExecuteStatusResponse>('GET', `/v1/sessions/${sessionId}/status`);
  }

  /**
   * Poll for messages and updates from the agent
   *
   * @param sessionId - Session UUID
   * @param afterId - Return messages with ID > afterId (for polling)
   * @param sanitize - Filter out system messages, prompts, and images
   * @returns MessagesResponse with messages list and status
   *
   * @example
   * ```typescript
   * const messages = await client.sessions.getMessages('session-uuid', 0);
   * for (const msg of messages.messages) {
   *   console.log(`[${msg.type}] ${msg.content}`);
   * }
   * ```
   */
  async getMessages(
    sessionId: string,
    afterId: number = 0,
    sanitize: boolean = true
  ): Promise<MessagesResponse> {
    const response = await this.http.request<Record<string, unknown>>(
      'GET',
      `/v1/sessions/${sessionId}/messages`,
      {
        query: {
          after_id: String(afterId),
          sanitize: String(sanitize),
        },
      }
    );

    return {
      messages: (response.messages || []) as MessagesResponse['messages'],
      status: response.status as string,
      hasAgent: (response.has_agent ?? response.hasAgent ?? false) as boolean,
    };
  }

  /**
   * Stream real-time events from the session via Server-Sent Events
   *
   * @param sessionId - Session UUID
   * @param options - Stream options
   * @yields SSEEvent objects
   *
   * @example
   * ```typescript
   * for await (const event of client.sessions.streamEvents('session-uuid')) {
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
  async *streamEvents(
    sessionId: string,
    options?: {
      eventTypes?: string[];
      sanitize?: boolean;
      includeHistory?: boolean;
    }
  ): AsyncGenerator<SSEEvent> {
    const query: Record<string, string> = {
      sanitize: String(options?.sanitize ?? true),
      include_history: String(options?.includeHistory ?? true),
    };

    if (options?.eventTypes) {
      query.event_types = options.eventTypes.join(',');
    }

    yield* this.http.streamEvents(`/v1/sessions/${sessionId}/events`, query);
  }

  // ===== SESSION CONTROL =====

  /**
   * Temporarily pause task execution
   *
   * @param sessionId - Session UUID
   * @returns SuccessResponse confirming pause
   *
   * @example
   * ```typescript
   * await client.sessions.pause('session-uuid');
   * ```
   */
  async pause(sessionId: string): Promise<SuccessResponse> {
    return this.http.request<SuccessResponse>('POST', `/v1/sessions/${sessionId}/pause`);
  }

  /**
   * Resume a paused task
   *
   * @param sessionId - Session UUID
   * @returns SuccessResponse confirming resume
   *
   * @example
   * ```typescript
   * await client.sessions.resume('session-uuid');
   * ```
   */
  async resume(sessionId: string): Promise<SuccessResponse> {
    return this.http.request<SuccessResponse>('POST', `/v1/sessions/${sessionId}/resume`);
  }

  /**
   * Cancel task execution
   *
   * @param sessionId - Session UUID
   * @returns SuccessResponse confirming cancellation
   *
   * @example
   * ```typescript
   * await client.sessions.cancel('session-uuid');
   * ```
   */
  async cancel(sessionId: string): Promise<SuccessResponse> {
    return this.http.request<SuccessResponse>('POST', `/v1/sessions/${sessionId}/cancel`);
  }

  // ===== BROWSER CONTROL =====

  /**
   * Navigate the browser to a specific URL
   *
   * @param sessionId - Session UUID
   * @param url - URL to navigate to
   * @returns NavigateResponse with current URL
   *
   * @example
   * ```typescript
   * await client.sessions.navigate('session-uuid', 'https://amazon.com');
   * ```
   */
  async navigate(sessionId: string, url: string): Promise<NavigateResponse> {
    const response = await this.http.request<Record<string, unknown>>(
      'POST',
      `/v1/sessions/${sessionId}/navigate`,
      {
        json: { url },
      }
    );

    return {
      currentUrl: (response.current_url ?? response.currentUrl) as string,
    };
  }

  /**
   * Get a screenshot of the browser
   *
   * @param sessionId - Session UUID
   * @returns ScreenshotResponse with base64-encoded image, URL, and title
   *
   * @example
   * ```typescript
   * const screenshot = await client.sessions.screenshot('session-uuid');
   * console.log(screenshot.url);
   * ```
   */
  async screenshot(sessionId: string): Promise<ScreenshotResponse> {
    return this.http.request<ScreenshotResponse>('GET', `/v1/sessions/${sessionId}/screenshot`);
  }

  // ===== CLIENT-DRIVEN SESSION CONTROL =====

  /**
   * Execute a single step for client-driven sessions (desktop, quantum, android).
   *
   * For stateless sessions, the client manages the execution loop. This method
   * sends a screenshot to the agent and receives actions to execute locally.
   *
   * @param sessionId - Session UUID
   * @param screenshot - Base64-encoded screenshot (full resolution, JPEG or PNG)
   * @param message - Optional user message (goal on first call, or follow-up instruction)
   * @param options - Optional OS and screen dimension info
   * @returns StepDesktopResponse with actions, thinking, finished, askUser, and step
   *
   * @example
   * ```typescript
   * // Create a desktop session
   * const session = await client.sessions.create('agi-2-claude', {
   *   agentSessionType: 'desktop',
   *   goal: 'Open calculator and compute 2+2'
   * });
   *
   * // Client-managed loop
   * let finished = false;
   * while (!finished) {
   *   const screenshot = captureScreenshot(); // Client captures
   *   const result = await client.sessions.step(session.sessionId, screenshot);
   *   executeActions(result.actions); // Client executes
   *   finished = result.finished;
   *   if (result.askUser) {
   *     const answer = await promptUser(result.askUser);
   *     // Send answer in next step
   *   }
   * }
   * ```
   */
  async step(
    sessionId: string,
    screenshot: string,
    message?: string,
    options?: {
      os?: string;
      screenWidth?: number;
      screenHeight?: number;
    }
  ): Promise<StepDesktopResponse> {
    const payload: Record<string, unknown> = { screenshot };

    if (message !== undefined) {
      payload.message = message;
    }
    if (options?.os !== undefined) {
      payload.os = options.os;
    }
    if (options?.screenWidth !== undefined) {
      payload.screen_width = options.screenWidth;
    }
    if (options?.screenHeight !== undefined) {
      payload.screen_height = options.screenHeight;
    }

    const response = await this.http.request<Record<string, unknown>>(
      'POST',
      `/v1/sessions/${sessionId}/step`,
      { json: payload }
    );

    return {
      actions: (response.actions || []) as StepDesktopResponse['actions'],
      thinking: response.thinking as string | undefined,
      finished: (response.finished ?? false) as boolean,
      askUser: (response.ask_user ?? response.askUser) as string | undefined,
      step: (response.step ?? 0) as number,
    };
  }

  // ===== MODELS =====

  /**
   * List available agent models.
   *
   * @param filter - Optional filter: "cdp" for browser agents, "quantum" for
   *                 quantum protocol agents, "desktop" for desktop agents,
   *                 "android" for Android agents
   * @returns ModelsResponse with list of available model names
   *
   * @example
   * ```typescript
   * // List all models
   * const models = await client.sessions.listModels();
   * console.log(models.models);
   *
   * // List only desktop-compatible models
   * const desktopModels = await client.sessions.listModels('desktop');
   * console.log(desktopModels.models);
   * // ['agi-2-claude', 'agi-2-qwen']
   * ```
   */
  async listModels(filter?: string): Promise<ModelsResponse> {
    const query: Record<string, string> = {};
    if (filter) {
      query.filter = filter;
    }

    return this.http.request<ModelsResponse>('GET', '/v1/models', { query });
  }
}
