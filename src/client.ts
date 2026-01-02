/**
 * Main AGI API client
 */

import { HTTPClient } from './http';
import { Session } from './session';
import type { AGIClientOptions, CreateSessionOptions, SessionResponse } from './types';

/**
 * Official TypeScript/JavaScript client for the AGI.tech API
 *
 * The AGIClient provides access to the AGI API for creating and managing
 * AI agent sessions that can perform complex web tasks.
 *
 * @example
 * Simple usage (recommended):
 * ```typescript
 * import { AGIClient } from 'agi-sdk';
 *
 * const client = new AGIClient({ apiKey: 'your_api_key' });
 * const session = await client.createSession('agi-0');
 *
 * try {
 *   const result = await session.runTask('Find cheapest iPhone 15 on Amazon');
 *   console.log(result);
 * } finally {
 *   await session.delete();
 * }
 * ```
 *
 * @example
 * Advanced usage with event streaming:
 * ```typescript
 * const session = await client.createSession('agi-0', {
 *   webhookUrl: 'https://yourapp.com/webhook'
 * });
 *
 * await session.sendMessage('Find flights from SFO to JFK under $450');
 *
 * for await (const event of session.streamEvents()) {
 *   if (event.event === 'thought') {
 *     console.log('Agent:', event.data);
 *   }
 *   if (event.event === 'done') {
 *     console.log('Result:', event.data);
 *     break;
 *   }
 * }
 *
 * await session.delete();
 * ```
 */
export class AGIClient {
  private readonly http: HTTPClient;

  /**
   * Create a new AGI client
   *
   * @param options - Client configuration options
   *
   * @example
   * ```typescript
   * // With explicit API key
   * const client = new AGIClient({ apiKey: 'your_api_key' });
   *
   * // With custom base URL
   * const client = new AGIClient({
   *   apiKey: 'your_api_key',
   *   baseUrl: 'https://custom-api.example.com',
   *   timeout: 120000,
   * });
   * ```
   */
  constructor(options: AGIClientOptions) {
    if (!options.apiKey) {
      throw new Error(
        'api_key is required. Either pass it as a parameter or set the AGI_API_KEY environment variable.'
      );
    }

    this.http = new HTTPClient(options);
  }

  /**
   * Create a new agent session
   *
   * @param agentName - Agent model to use (e.g., "agi-0", "agi-0-fast", "agi-1")
   * @param options - Optional session creation options
   * @returns Session instance
   *
   * @example
   * ```typescript
   * // Simple session
   * const session = await client.createSession('agi-0');
   *
   * // Session with options
   * const session = await client.createSession('agi-0-fast', {
   *   webhookUrl: 'https://yourapp.com/webhook',
   *   maxSteps: 200,
   * });
   * ```
   */
  async createSession(agentName = 'agi-0', options?: CreateSessionOptions): Promise<Session> {
    const payload: Record<string, unknown> = {
      agent_name: agentName,
      max_steps: options?.maxSteps ?? 100,
    };

    if (options?.webhookUrl) {
      payload.webhook_url = options.webhookUrl;
    }
    if (options?.goal) {
      payload.goal = options.goal;
    }
    if (options?.restoreFromEnvironmentId) {
      payload.restore_from_environment_id = options.restoreFromEnvironmentId;
    }

    const response = await this.http.request<SessionResponse>('POST', '/v1/sessions', {
      json: payload,
    });

    return new Session(this.http, response);
  }

  /**
   * List all sessions for the authenticated user
   *
   * @returns Array of session instances
   *
   * @example
   * ```typescript
   * const sessions = await client.listSessions();
   * console.log(`Found ${sessions.length} active session(s)`);
   *
   * for (const session of sessions) {
   *   console.log(`Session ${session.sessionId}: ${session.status}`);
   * }
   * ```
   */
  async listSessions(): Promise<Session[]> {
    const responses = await this.http.request<SessionResponse[]>('GET', '/v1/sessions');

    return responses.map((data) => new Session(this.http, data));
  }

  /**
   * Get a specific session by ID
   *
   * @param sessionId - Session UUID
   * @returns Session instance
   *
   * @example
   * ```typescript
   * const session = await client.getSession('session-uuid-here');
   * console.log(`Status: ${session.status}`);
   * ```
   */
  async getSession(sessionId: string): Promise<Session> {
    const response = await this.http.request<SessionResponse>(
      'GET',
      `/v1/sessions/${sessionId}`
    );

    return new Session(this.http, response);
  }

  /**
   * Delete all sessions for the authenticated user
   *
   * @example
   * ```typescript
   * await client.deleteAllSessions();
   * console.log('All sessions deleted');
   * ```
   */
  async deleteAllSessions(): Promise<void> {
    await this.http.request('DELETE', '/v1/sessions');
  }
}
