/**
 * Utility functions for the AGI SDK
 */

/**
 * Get value from object supporting both snake_case and camelCase
 */
export function getField<T>(obj: any, camelCase: string, snakeCase: string): T | undefined {
  return obj[snakeCase] ?? obj[camelCase];
}

/**
 * Normalize API response from snake_case to camelCase for SessionResponse
 */
export function normalizeSessionResponse(data: any): any {
  return {
    sessionId: data.session_id ?? data.sessionId,
    vncUrl: data.vnc_url ?? data.vncUrl,
    agentUrl: data.agent_url ?? data.agentUrl,
    agentName: data.agent_name ?? data.agentName,
    status: data.status,
    createdAt: data.created_at ?? data.createdAt,
    environmentId: data.environment_id ?? data.environmentId,
    goal: data.goal,
  };
}
