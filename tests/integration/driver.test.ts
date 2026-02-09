/**
 * Integration tests for AgentDriver with the agi-driver binary.
 *
 * These tests require:
 *   - agi-driver binary available (via @agi/agi-{platform} package or in PATH)
 *   - AGI_API_KEY: valid AGI API key
 *
 * They spawn the real driver, communicate over JSON lines, and run
 * a real task via the AGI API.
 */

import { describe, it, expect } from 'vitest';
import { AgentDriver } from '../../src/driver/driver';
import { isBinaryAvailable } from '../../src/driver/binary';

const HAS_DRIVER = isBinaryAvailable();
const HAS_API_KEY = !!process.env.AGI_API_KEY;

describe.skipIf(!HAS_DRIVER || !HAS_API_KEY)('AgentDriver real integration', () => {
  it('should complete a local mode task (client-desktop)', async () => {
    const thinkingTexts: string[] = [];
    const actions: unknown[] = [];
    const states: string[] = [];

    const driver = new AgentDriver({
      mode: 'local',
      env: { AGI_API_KEY: process.env.AGI_API_KEY! },
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
    // TODO: thinking events depend on API returning thinking text (not yet implemented)
    // expect(thinkingTexts.length).toBeGreaterThan(0);
    expect(states).toContain('running');
  }, 120_000);

  it('should complete a remote mode task (client-managed-desktop)', async () => {
    const states: string[] = [];
    let sessionCreated = false;
    let sessionError = '';

    const driver = new AgentDriver({
      mode: 'remote',
      environmentType: 'ubuntu-1',
      env: { AGI_API_KEY: process.env.AGI_API_KEY! },
    });

    driver.on('state_change', (state: string) => states.push(state));
    driver.on('session_created', () => {
      sessionCreated = true;
    });
    driver.on('error', (err: { message?: string }) => {
      if (err.message?.includes('503') || err.message?.includes('entrypoint')) {
        sessionError = err.message;
      }
    });

    try {
      const result = await driver.start(
        'Take a screenshot and describe what you see. Then finish.',
        '',
        0,
        0,
        'remote'
      );

      expect(result.success).toBe(true);
      expect(result.summary).toBeTruthy();
      expect(sessionCreated).toBe(true);
      expect(states).toContain('running');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('503') || msg.includes('entrypoint') || sessionError) {
        console.log('SKIP: Remote environment unavailable (503)');
        return;
      }
      throw err;
    }
  }, 180_000);

  it('should handle stop during execution', async () => {
    const states: string[] = [];

    const driver = new AgentDriver({
      mode: 'local',
      env: { AGI_API_KEY: process.env.AGI_API_KEY! },
    });

    driver.on('state_change', (state: string) => states.push(state));

    // Gate on running state (always emitted after session creation)
    const gotRunning = new Promise<void>((resolve) => {
      driver.on('state_change', (state: string) => {
        if (state === 'running') resolve();
      });
    });

    const resultPromise = driver.start('Describe the screen', '', 0, 0, 'local');

    await gotRunning;
    await driver.stop('test complete');

    // Should resolve or reject without hanging
    try {
      await resultPromise;
    } catch {
      // Stopped driver may reject; that's expected
    }

    expect(states).toContain('running');
  }, 120_000);
});
