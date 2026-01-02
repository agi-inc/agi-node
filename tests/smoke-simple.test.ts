/**
 * Simple smoke test - each test creates its own session
 */

import { describe, it, expect } from 'vitest';
import {
  AGIClient,
  AuthenticationError,
  NotFoundError,
} from '../src';

const API_KEY = process.env.AGI_API_KEY || 'f94a74fa-bcdf-429f-97b0-37b7a1df6ab2';

console.log('='.repeat(80));
console.log('🧪 AGI SDK SMOKE TESTS - Quick Feature Validation');
console.log('='.repeat(80));
console.log();

describe('AGI SDK Smoke Tests', () => {
  it('should initialize client with API key', () => {
    const client = new AGIClient({ apiKey: API_KEY });
    expect(client).toBeDefined();
    console.log('✅ Client initialization');
  });

  it('should handle authentication errors', async () => {
    const client = new AGIClient({ apiKey: 'invalid_key' });
    await expect(client.listSessions()).rejects.toThrow(AuthenticationError);
    console.log('✅ Authentication error handling');
  }, 20000);

  it('should create and delete session', async () => {
    const client = new AGIClient({ apiKey: API_KEY });
    const session = await client.createSession('agi-0');

    expect(session).toBeDefined();
    expect(session.sessionId).toBeDefined();
    expect(session.vncUrl).toBeDefined();
    console.log(`✅ Session created: ${session.sessionId.substring(0, 20)}...`);

    await session.delete();
    console.log('✅ Session deleted');
  }, 30000);

  it('should list sessions', async () => {
    const client = new AGIClient({ apiKey: API_KEY });
    const sessions = await client.listSessions();

    expect(Array.isArray(sessions)).toBe(true);
    console.log(`✅ Found ${sessions.length} session(s)`);
  }, 20000);

  it('should send message and get status', async () => {
    const client = new AGIClient({ apiKey: API_KEY });
    const session = await client.createSession('agi-0');

    try {
      await session.sendMessage('Hello, test message');
      console.log('✅ Message sent');

      const status = await session.getStatus();
      expect(status.status).toBeDefined();
      console.log(`✅ Status: ${status.status}`);
    } finally {
      await session.delete();
    }
  }, 30000);

  it('should navigate and screenshot', async () => {
    const client = new AGIClient({ apiKey: API_KEY });
    const session = await client.createSession('agi-0');

    try {
      const navResult = await session.navigate('https://example.com');
      expect(navResult.currentUrl).toBeDefined();
      console.log(`✅ Navigated to: ${navResult.currentUrl}`);

      const screenshot = await session.screenshot();
      expect(screenshot.screenshot).toBeDefined();
      console.log(`✅ Screenshot captured (${screenshot.screenshot.length} chars)`);
    } finally {
      await session.delete();
    }
  }, 30000);

  it('should pause and resume session', async () => {
    const client = new AGIClient({ apiKey: API_KEY });
    const session = await client.createSession('agi-0');

    try {
      await session.sendMessage('Count to 100');
      await new Promise(resolve => setTimeout(resolve, 1000));

      await session.pause();
      console.log('✅ Session paused');

      await session.resume();
      console.log('✅ Session resumed');
    } finally {
      await session.delete();
    }
  }, 30000);

  it('should cancel session', async () => {
    const client = new AGIClient({ apiKey: API_KEY });
    const session = await client.createSession('agi-0');

    try {
      await session.sendMessage('Long task');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await session.cancel();
      expect(result).toBeDefined();
      console.log('✅ Session cancelled');
    } finally {
      await session.delete();
    }
  }, 30000);

  it('should handle NotFoundError', async () => {
    const client = new AGIClient({ apiKey: API_KEY });

    await expect(
      client.getSession('00000000-0000-0000-0000-000000000000')
    ).rejects.toThrow(NotFoundError);
    console.log('✅ NotFoundError handling');
  }, 20000);
});
