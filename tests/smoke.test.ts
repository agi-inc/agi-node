/**
 * Smoke tests - validates all SDK features work correctly with real API
 */

import { describe, it, expect } from 'vitest';
import {
  AGIClient,
  AuthenticationError,
  NotFoundError,
  type Session,
} from '../src';

const API_KEY = process.env.AGI_API_KEY || 'f94a74fa-bcdf-429f-97b0-37b7a1df6ab2';

describe('AGI SDK Smoke Tests', () => {
  let testSession: Session | null = null;

  // Test 1: Client Initialization
  it('should initialize client with API key', () => {
    const client = new AGIClient({ apiKey: API_KEY });
    expect(client).toBeDefined();
  });

  // Test 2: Client initialization should fail without API key
  it('should throw error when API key is missing', () => {
    expect(() => new AGIClient({ apiKey: '' })).toThrow();
  });

  // Test 3: Authentication error handling
  it('should handle authentication errors', async () => {
    const client = new AGIClient({ apiKey: 'invalid_key' });

    await expect(client.listSessions()).rejects.toThrow(AuthenticationError);
  }, 15000);

  // Test 4: Create session
  it('should create a new session', async () => {
    const client = new AGIClient({ apiKey: API_KEY });
    const session = await client.createSession('agi-0');

    expect(session).toBeDefined();
    expect(session.sessionId).toBeDefined();
    expect(session.vncUrl).toBeDefined();
    expect(session.status).toBeDefined();

    testSession = session;
    console.log(`    Session created: ${session.sessionId.substring(0, 20)}...`);
  }, 15000);

  // Test 5: List sessions
  it('should list all sessions', async () => {
    const client = new AGIClient({ apiKey: API_KEY });
    const sessions = await client.listSessions();

    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThan(0);
    console.log(`    Found ${sessions.length} session(s)`);
  }, 15000);

  // Test 6: Get session
  it('should get session details', async () => {
    if (!testSession) throw new Error('No test session');

    const client = new AGIClient({ apiKey: API_KEY });
    const session = await client.getSession(testSession.sessionId);

    expect(session.sessionId).toBe(testSession.sessionId);
    console.log(`    Status: ${session.status}`);
  }, 15000);

  // Test 7: Send message (low-level)
  it('should send message to session', async () => {
    if (!testSession) throw new Error('No test session');

    const result = await testSession.sendMessage('Hello, test message');
    expect(result).toBeDefined();
    console.log('    Message sent');
  }, 15000);

  // Test 8: Get status
  it('should get session status', async () => {
    if (!testSession) throw new Error('No test session');

    const status = await testSession.getStatus();
    expect(status.status).toBeDefined();
    console.log(`    Status: ${status.status}`);
  }, 15000);

  // Test 9: Navigate
  it('should navigate to URL', async () => {
    if (!testSession) throw new Error('No test session');

    const result = await testSession.navigate('https://example.com');
    expect(result.currentUrl).toBeDefined();
    console.log(`    Navigated to: ${result.currentUrl}`);
  }, 15000);

  // Test 10: Screenshot
  it('should take screenshot', async () => {
    if (!testSession) throw new Error('No test session');

    const screenshot = await testSession.screenshot();
    expect(screenshot.screenshot).toBeDefined();
    expect(screenshot.url).toBeDefined();
    expect(screenshot.title).toBeDefined();
    console.log(`    Screenshot captured (${screenshot.screenshot.length} chars)`);
  }, 15000);

  // Test 11: Pause session
  it('should pause session', async () => {
    if (!testSession) throw new Error('No test session');

    await testSession.sendMessage('Count to 100');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = await testSession.pause();
    expect(result).toBeDefined();
    console.log('    Session paused');
  }, 15000);

  // Test 12: Resume session
  it('should resume session', async () => {
    if (!testSession) throw new Error('No test session');

    const result = await testSession.resume();
    expect(result).toBeDefined();
    console.log('    Session resumed');
  }, 15000);

  // Test 13: Cancel session
  it('should cancel session', async () => {
    if (!testSession) throw new Error('No test session');

    await testSession.sendMessage('Another task');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = await testSession.cancel();
    expect(result).toBeDefined();
    console.log('    Session cancelled');
  }, 15000);

  // Test 14: NotFoundError handling
  it('should handle NotFoundError', async () => {
    const client = new AGIClient({ apiKey: API_KEY });

    await expect(
      client.getSession('00000000-0000-0000-0000-000000000000')
    ).rejects.toThrow(NotFoundError);
  }, 15000);

  // Test 15: Delete session
  it('should delete session', async () => {
    if (!testSession) throw new Error('No test session');

    const result = await testSession.delete();
    expect(result).toBeDefined();
    console.log('    Session deleted');
  }, 15000);

  // Test 16: Delete all sessions
  it('should delete all sessions', async () => {
    const client = new AGIClient({ apiKey: API_KEY });

    // Create a couple sessions first
    const s1 = await client.createSession('agi-0');
    const s2 = await client.createSession('agi-0');

    await client.deleteAllSessions();
    console.log('    All sessions deleted');

    // Verify they're gone
    const sessions = await client.listSessions();
    expect(sessions.length).toBe(0);
  }, 30000);
});
