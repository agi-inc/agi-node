/**
 * Utility functions for the AGI SDK
 */

import type { SessionResponse, SessionStatus } from './types';

/**
 * Get value from object supporting both snake_case and camelCase
 */
export function getField<T>(
  obj: Record<string, unknown>,
  camelCase: string,
  snakeCase: string
): T | undefined {
  return (obj[snakeCase] ?? obj[camelCase]) as T | undefined;
}

/**
 * Normalize API response from snake_case to camelCase for SessionResponse
 */
export function normalizeSessionResponse(data: Record<string, unknown>): SessionResponse {
  return {
    sessionId: (data.session_id ?? data.sessionId) as string,
    vncUrl: (data.vnc_url ?? data.vncUrl) as string,
    agentUrl: (data.agent_url ?? data.agentUrl) as string | undefined,
    agentName: (data.agent_name ?? data.agentName) as string,
    status: data.status as SessionStatus,
    createdAt: (data.created_at ?? data.createdAt) as string,
    environmentId: (data.environment_id ?? data.environmentId) as string | undefined,
    goal: data.goal as string | undefined,
  };
}
