/**
 * Integration tests for AgentDriver with the agi-driver binary.
 *
 * These tests require:
 *   - agi-driver binary available (via @agi/agi-{platform} package or in PATH)
 *   - ANTHROPIC_API_KEY: valid Anthropic API key
 *
 * They spawn the real driver, communicate over JSON lines, and run
 * a real task with the Anthropic API.
 */

import { describe, it, expect } from 'vitest';
import { AgentDriver } from '../../src/driver/driver';
import { isBinaryAvailable } from '../../src/driver/binary';

const HAS_DRIVER = isBinaryAvailable();
const HAS_API_KEY = !!process.env.ANTHROPIC_API_KEY;

describe.skipIf(!HAS_DRIVER || !HAS_API_KEY)('AgentDriver real integration', () => {
  it('should complete a local mode task', async () => {
    const thinkingTexts: string[] = [];
    const actions: unknown[] = [];
    const states: string[] = [];

    const driver = new AgentDriver({
      mode: 'local',
      env: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY! },
    });

    driver.on('thinking', (text: string) => thinkingTexts.push(text));
    driver.on('action', (action: unknown) => actions.push(action));
    driver.on('state_change', (state: string) => states.push(state));

    const result = await driver.start(
      'Take a screenshot and describe what you see. Then finish.',
      '',
      0,
      0,
      'local'
    );

    expect(result.success).toBe(true);
    expect(result.summary).toBeTruthy();
    expect(thinkingTexts.length).toBeGreaterThan(0);
    expect(states).toContain('running');
  }, 60_000);

  it('should handle stop during execution', async () => {
    const states: string[] = [];

    const driver = new AgentDriver({
      mode: 'local',
      env: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY! },
    });

    driver.on('state_change', (state: string) => states.push(state));

    const gotThinking = new Promise<void>((resolve) => {
      driver.on('thinking', () => resolve());
    });

    const resultPromise = driver.start('Describe the screen', '', 0, 0, 'local');

    await gotThinking;
    await driver.stop('test complete');

    // Should resolve or reject without hanging
    try {
      await resultPromise;
    } catch {
      // Stopped driver may reject; that's expected
    }

    expect(states).toContain('running');
  }, 60_000);
});
