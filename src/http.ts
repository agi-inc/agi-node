/**
 * HTTP client for AGI API with fetch and SSE support
 */

import { createParser, type EventSourceParser } from 'eventsource-parser';
import type { AGIClientOptions, SSEEvent } from './types';
import {
  AGIError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from './errors';

export interface RequestOptions {
  json?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

export class HTTPClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(options: AGIClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? 'https://api.agi.tech';
    this.timeout = options.timeout ?? 60000;
    this.maxRetries = options.maxRetries ?? 3;
  }

  /**
   * Make an HTTP request with retries and error handling
   */
  async request<T>(
    method: string,
    path: string,
    options?: RequestOptions
  ): Promise<T> {
    const url = this.buildUrl(path, options?.query);
    const headers = this.buildHeaders(options?.headers);

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers,
          body: options?.json ? JSON.stringify(options.json) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle errors
        if (!response.ok) {
          await this.handleErrorResponse(response);
        }

        // Parse JSON response
        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx except 429)
        if (error instanceof AGIError && error.statusCode && error.statusCode < 500) {
          if (error.statusCode !== 429) {
            throw error;
          }
        }

        // Don't retry on abort/timeout on last attempt
        if (attempt === this.maxRetries) {
          break;
        }

        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }

    throw lastError || new AGIError('Request failed after retries');
  }

  /**
   * Stream Server-Sent Events from an endpoint
   */
  async *streamEvents(path: string, query?: Record<string, string>): AsyncGenerator<SSEEvent> {
    const url = this.buildUrl(path, query);
    const headers = this.buildHeaders();

    const controller = new AbortController();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...headers,
        Accept: 'text/event-stream',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    if (!response.body) {
      throw new AGIError('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const parser: EventSourceParser = createParser((event) => {
      if (event.type === 'event') {
        try {
          const data = JSON.parse(event.data);
          this.pendingEvents.push({
            id: event.id,
            event: event.event as any,
            data,
          });
        } catch {
          // Skip unparseable events
        }
      }
    });

    const pendingEvents: SSEEvent[] = [];
    this.pendingEvents = pendingEvents;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        parser.feed(buffer);
        buffer = '';

        // Yield all pending events
        while (pendingEvents.length > 0) {
          const event = pendingEvents.shift();
          if (event) {
            yield event;
          }
        }
      }
    } finally {
      controller.abort();
      reader.releaseLock();
    }
  }

  private pendingEvents: SSEEvent[] = [];

  private buildUrl(path: string, query?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return url.toString();
  }

  private buildHeaders(additional?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'User-Agent': 'agi-sdk-node/1.0.0',
      ...additional,
    };
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any;

    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }

    const errorMessage =
      typeof errorData === 'object' && errorData.message
        ? errorData.message
        : typeof errorData === 'string'
          ? errorData
          : `HTTP ${response.status}: ${response.statusText}`;

    switch (response.status) {
      case 401:
        throw new AuthenticationError(`Authentication failed: ${errorMessage}`, errorData);
      case 404:
        throw new NotFoundError(`Resource not found: ${errorMessage}`, errorData);
      case 422:
        throw new ValidationError(`Validation error: ${errorMessage}`, errorData);
      case 429:
        throw new RateLimitError(`Rate limit exceeded: ${errorMessage}`, errorData);
      default:
        throw new AGIError(`API error (${response.status}): ${errorMessage}`, response.status, errorData);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
