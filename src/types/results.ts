/**
 * Result types for task execution
 */

/**
 * Task execution metadata and performance metrics
 */
export interface TaskMetadata {
  /** Unique task identifier */
  taskId: string | number;
  /** Session ID */
  sessionId: string;
  /** Execution time in seconds */
  duration: number;
  /** Task cost in USD (not yet provided by API) */
  cost: number;
  /** Task completion timestamp */
  timestamp: Date;
  /** Number of steps executed */
  steps: number;
  /** Whether task succeeded */
  success: boolean;
}

/**
 * Result of task execution
 *
 * @example
 * ```typescript
 * const result = await session.runTask("Find flights...");
 * console.log(result.data);
 * console.log(`Duration: ${result.metadata.duration}s`);
 * console.log(`Steps: ${result.metadata.steps}`);
 * ```
 */
export interface TaskResult<T = unknown> {
  /** Task output data */
  data: T;
  /** Execution metadata */
  metadata: TaskMetadata;
}
