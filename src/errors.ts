/**
 * Error classes for AGI SDK
 */

/**
 * Base error class for all AGI API errors
 */
export class AGIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'AGIError';
    Object.setPrototypeOf(this, AGIError.prototype);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AGIError {
  constructor(message: string, response?: unknown) {
    super(message, 401, response);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AGIError {
  constructor(message: string, response?: unknown) {
    super(message, 404, response);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AGIError {
  constructor(message: string, response?: unknown) {
    super(message, 429, response);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Agent execution error (task failed)
 */
export class AgentExecutionError extends AGIError {
  constructor(message: string, response?: unknown) {
    super(message, undefined, response);
    this.name = 'AgentExecutionError';
    Object.setPrototypeOf(this, AgentExecutionError.prototype);
  }
}

/**
 * Validation error (422)
 */
export class ValidationError extends AGIError {
  constructor(message: string, response?: unknown) {
    super(message, 422, response);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Permission error (403)
 */
export class PermissionError extends AGIError {
  constructor(message: string, response?: unknown) {
    super(message, 403, response);
    this.name = 'PermissionError';
    Object.setPrototypeOf(this, PermissionError.prototype);
  }
}

/**
 * API error (5xx server errors)
 */
export class APIError extends AGIError {
  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message, statusCode, response);
    this.name = 'APIError';
    Object.setPrototypeOf(this, APIError.prototype);
  }
}
