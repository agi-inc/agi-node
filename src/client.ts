/**
 * Main AGI API client
 */

import { HTTPClient } from './http';
import { SessionContext } from './context/session-context';
import { SessionsResource } from './resources/sessions';
import type { AGIClientOptions } from './types';

/**
 * Official TypeScript/JavaScript client for the AGI.tech API
 *
 * The AGIClient provides access to the AGI API for creating and managing
 * AI agent sessions that can perform complex web tasks.
 *
 * @example
 * Simple usage with context manager (recommended):
 * ```typescript
 * import { AGIClient } from 'agi-sdk';
 *
 * const client = new AGIClient({ apiKey: 'your_api_key' });
 *
 * await using session = client.session('agi-0');
 * const result = await session.runTask('Find cheapest iPhone 15 on Amazon');
 * console.log(result.data);
 * console.log(`Duration: ${result.metadata.duration}s`);
 * ```
 *
 * @example
 * Advanced usage with low-level API:
 * ```typescript
 * const session = await client.sessions.create('agi-0', {
 *   webhookUrl: 'https://yourapp.com/webhook'
 * });
 *
 * await client.sessions.sendMessage(session.sessionId, 'Find flights...');
 *
 * for await (const event of client.sessions.streamEvents(session.sessionId)) {
 *   if (event.event === 'thought') {
 *     console.log('Agent:', event.data);
 *   }
 *   if (event.event === 'done') {
 *     break;
 *   }
 * }
 *
 * await client.sessions.delete(session.sessionId);
 * ```
 */
export class AGIClient {
  private readonly http: HTTPClient;

  /** Sessions resource for low-level API access */
  public readonly sessions: SessionsResource;

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
    this.sessions = new SessionsResource(this.http);
  }

  /**
   * Create a session context manager for easy session lifecycle management (recommended)
   *
   * This is the recommended way to use the SDK. The context manager automatically
   * creates and deletes the session using `await using` syntax.
   *
   * @param agentName - Agent model to use (e.g., "agi-0", "agi-0-fast", "agi-1")
   * @param options - Session creation options
   * @returns SessionContext manager
   *
   * @example
   * ```typescript
   * // Simple usage
   * await using session = client.session('agi-0');
   * const result = await session.runTask('Find flights SFO→JFK under $450');
   * console.log(result.data);
   * // Session automatically deleted
   *
   * // With options
   * await using session = client.session('agi-0', {
   *   webhookUrl: 'https://yourapp.com/webhook',
   *   maxSteps: 200
   * });
   * const result = await session.runTask('Research company XYZ');
   * ```
   */
  session(
    agentName: string = 'agi-0',
    options?: {
      webhookUrl?: string;
      goal?: string;
      maxSteps?: number;
      restoreFromEnvironmentId?: string;
    }
  ): SessionContext {
    return new SessionContext(this, agentName, options);
  }
}
