/**
 * Utility functions for the AGI SDK
 */

/**
 * Convert snake_case object keys to camelCase
 * Also preserves original keys for backward compatibility
 */
export function normalizeResponse<T>(data: any): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => normalizeResponse(item)) as any;
  }

  const normalized: any = {};

  for (const [key, value] of Object.entries(data)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    // Store in both formats for compatibility
    normalized[camelKey] = value;
    if (camelKey !== key) {
      normalized[key] = value;
    }
  }

  return normalized as T;
}

/**
 * Get value from object supporting both snake_case and camelCase
 */
export function getField<T>(obj: any, camelCase: string, snakeCase: string): T | undefined {
  return obj[snakeCase] ?? obj[camelCase];
}
