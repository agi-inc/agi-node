/**
 * Comprehensive test suite for AGI SDK
 * Tests all major features, error handling, and edge cases
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  AGIClient,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  AgentExecutionError,
} from '../src';

const API_KEY = process.env.AGI_API_KEY || 'f94a74fa-bcdf-429f-97b0-37b7a1df6ab2';

console.log('='.repeat(80));
console.log('🧪 COMPREHENSIVE AGI SDK TEST SUITE');
console.log('='.repeat(80));
console.log();

describe('AGI SDK - Comprehensive Tests', () => {
  let client: AGIClient;

  beforeAll(() => {
    client = new AGIClient({ apiKey: API_KEY });
  });

  afterAll(async () => {
    // Cleanup any remaining sessions
    try {
      await client.deleteAllSessions();
      console.log('✅ Cleaned up all test sessions');
    } catch (error) {
      console.log('⚠️  Cleanup error (non-critical):', error);
    }
  });

  describe('Client Initialization', () => {
    it('should create client with valid API key', () => {
      const testClient = new AGIClient({ apiKey: API_KEY });
      expect(testClient).toBeDefined();
      console.log('✅ Client created successfully');
    });

    it('should throw error when API key is missing', () => {
      expect(() => new AGIClient({ apiKey: '' })).toThrow();
      console.log('✅ Missing API key validation works');
    });

    it('should accept custom baseUrl', () => {
      const testClient = new AGIClient({
        apiKey: API_KEY,
        baseUrl: 'https://custom.example.com',
      });
      expect(testClient).toBeDefined();
      console.log('✅ Custom baseUrl accepted');
    });

    it('should accept custom timeout and maxRetries', () => {
      const testClient = new AGIClient({
        apiKey: API_KEY,
        timeout: 30000,
        maxRetries: 5,
      });
      expect(testClient).toBeDefined();
      console.log('✅ Custom timeout and maxRetries accepted');
    });
  });

  describe('Error Handling', () => {
    it('should throw AuthenticationError with invalid API key', async () => {
      const badClient = new AGIClient({ apiKey: 'invalid_key_12345' });
      await expect(badClient.listSessions()).rejects.toThrow(AuthenticationError);
      console.log('✅ AuthenticationError thrown correctly');
    }, 20000);

    it('should throw NotFoundError for non-existent session', async () => {
      await expect(
        client.getSession('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError);
      console.log('✅ NotFoundError thrown correctly');
    }, 20000);
  });

  describe('Session Management', () => {
    it('should create session with default agent', async () => {
      const session = await client.createSession();

      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.agentName).toBe('agi-0');
      expect(session.status).toBeDefined();
      expect(session.createdAt).toBeDefined();

      console.log(`✅ Session created: ${session.sessionId.substring(0, 20)}...`);
      console.log(`   Agent: ${session.agentName}`);
      console.log(`   Status: ${session.status}`);

      await session.delete();
      console.log('✅ Session deleted');
    }, 60000);

    it('should create session with specific agent', async () => {
      const session = await client.createSession('agi-0-fast');

      expect(session.agentName).toBe('agi-0-fast');
      console.log(`✅ Session created with agi-0-fast agent`);

      await session.delete();
    }, 60000);

    it('should create session with options', async () => {
      const session = await client.createSession('agi-0', {
        maxSteps: 50,
      });

      expect(session).toBeDefined();
      console.log(`✅ Session created with maxSteps=50`);

      await session.delete();
    }, 60000);

    it('should list all sessions', async () => {
      // Create a test session
      const session = await client.createSession('agi-0');

      const sessions = await client.listSessions();

      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThan(0);

      console.log(`✅ Listed ${sessions.length} session(s)`);

      await session.delete();
    }, 60000);

    it('should get specific session by ID', async () => {
      const session1 = await client.createSession('agi-0');
      const sessionId = session1.sessionId;

      const session2 = await client.getSession(sessionId);

      expect(session2.sessionId).toBe(sessionId);
      expect(session2.agentName).toBe(session1.agentName);

      console.log(`✅ Retrieved session: ${sessionId.substring(0, 20)}...`);

      await session1.delete();
    }, 60000);
  });

  describe('Session Status', () => {
    it('should get session status', async () => {
      const session = await client.createSession('agi-0');

      const status = await session.getStatus();

      expect(status).toBeDefined();
      expect(status.status).toBeDefined();
      expect(['ready', 'running', 'waiting_for_input', 'paused', 'finished', 'error']).toContain(status.status);

      console.log(`✅ Session status: ${status.status}`);

      await session.delete();
    }, 60000);
  });

  describe('Browser Navigation', () => {
    it('should navigate to a URL', async () => {
      const session = await client.createSession('agi-0');

      const result = await session.navigate('https://example.com');

      expect(result).toBeDefined();
      expect(result.currentUrl).toBeDefined();

      console.log(`✅ Navigated to: ${result.currentUrl}`);

      await session.delete();
    }, 60000);

    it('should take screenshot', async () => {
      const session = await client.createSession('agi-0');

      await session.navigate('https://example.com');
      const screenshot = await session.screenshot();

      expect(screenshot).toBeDefined();
      expect(screenshot.screenshot).toBeDefined();
      expect(screenshot.url).toBeDefined();
      expect(screenshot.title).toBeDefined();
      expect(screenshot.screenshot.length).toBeGreaterThan(0);

      console.log(`✅ Screenshot captured:`);
      console.log(`   URL: ${screenshot.url}`);
      console.log(`   Title: ${screenshot.title}`);
      console.log(`   Size: ${screenshot.screenshot.length} chars`);

      await session.delete();
    }, 60000);
  });

  describe('Message Handling', () => {
    it('should send message to session', async () => {
      const session = await client.createSession('agi-0');

      const result = await session.sendMessage('Navigate to example.com');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      console.log(`✅ Message sent successfully`);

      await session.delete();
    }, 60000);

    it('should get message history', async () => {
      const session = await client.createSession('agi-0');

      await session.sendMessage('Test message');

      // Wait a bit for message to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      const messages = await session.getMessages();

      expect(messages).toBeDefined();
      expect(messages.messages).toBeDefined();
      expect(Array.isArray(messages.messages)).toBe(true);

      console.log(`✅ Retrieved ${messages.messages.length} message(s)`);
      console.log(`   Status: ${messages.status}`);
      console.log(`   Has agent: ${messages.hasAgent}`);

      await session.delete();
    }, 60000);
  });

  describe('Session Control', () => {
    it('should pause and resume session', async () => {
      const session = await client.createSession('agi-0');

      await session.sendMessage('Count from 1 to 100');

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));

      const pauseResult = await session.pause();
      expect(pauseResult.success).toBe(true);
      console.log('✅ Session paused');

      const resumeResult = await session.resume();
      expect(resumeResult.success).toBe(true);
      console.log('✅ Session resumed');

      await session.delete();
    }, 60000);

    it('should cancel session', async () => {
      const session = await client.createSession('agi-0');

      await session.sendMessage('Long running task');

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = await session.cancel();
      expect(result.success).toBe(true);
      console.log('✅ Session cancelled');

      await session.delete();
    }, 60000);
  });

  describe('Event Streaming', () => {
    it('should stream events from session', async () => {
      const session = await client.createSession('agi-0');

      await session.sendMessage('What is 2 + 2?');

      const events: any[] = [];
      let eventCount = 0;
      const maxEvents = 10;

      for await (const event of session.streamEvents()) {
        events.push(event);
        eventCount++;

        console.log(`📨 Event ${eventCount}: ${event.event}`);

        if (event.event === 'done' || event.event === 'error' || eventCount >= maxEvents) {
          break;
        }
      }

      expect(events.length).toBeGreaterThan(0);
      console.log(`✅ Received ${events.length} event(s)`);

      await session.delete();
    }, 90000);

    it('should filter event types', async () => {
      const session = await client.createSession('agi-0');

      await session.sendMessage('Navigate to example.com');

      const thoughtEvents: any[] = [];
      let eventCount = 0;

      for await (const event of session.streamEvents({ eventTypes: ['thought', 'done', 'error'] })) {
        if (event.event === 'thought') {
          thoughtEvents.push(event);
        }

        eventCount++;

        if (event.event === 'done' || event.event === 'error' || eventCount >= 10) {
          break;
        }
      }

      console.log(`✅ Filtered events - received ${eventCount} total, ${thoughtEvents.length} thought events`);

      await session.delete();
    }, 90000);
  });

  describe('High-Level API', () => {
    it('should run simple task with runTask()', async () => {
      const session = await client.createSession('agi-0');

      try {
        const result = await session.runTask('What is the capital of France?');

        expect(result).toBeDefined();
        console.log(`✅ Task completed successfully`);
        console.log(`   Result:`, JSON.stringify(result).substring(0, 100));
      } catch (error) {
        // Task might timeout or fail, log it
        console.log(`⚠️  Task execution issue:`, error);
        throw error;
      } finally {
        await session.delete();
      }
    }, 120000);
  });

  describe('Session Deletion', () => {
    it('should delete session normally', async () => {
      const session = await client.createSession('agi-0');

      const result = await session.delete();

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(true);

      console.log('✅ Session deleted normally');
    }, 60000);

    it('should delete session with snapshot', async () => {
      const session = await client.createSession('agi-0');

      const result = await session.delete('filesystem');

      expect(result.success).toBe(true);
      expect(session.environmentId).toBeDefined();

      console.log(`✅ Session deleted with snapshot`);
      console.log(`   Environment ID: ${session.environmentId?.substring(0, 20)}...`);
    }, 60000);

    it('should delete all sessions', async () => {
      // Create multiple sessions
      const session1 = await client.createSession('agi-0');
      const session2 = await client.createSession('agi-0-fast');

      await client.deleteAllSessions();

      const sessions = await client.listSessions();
      expect(sessions.length).toBe(0);

      console.log('✅ All sessions deleted successfully');
    }, 60000);
  });

  describe('Session Restoration', () => {
    it('should restore session from environment ID', async () => {
      // Create and save session
      const session1 = await client.createSession('agi-0');
      await session1.navigate('https://example.com');

      const deleteResult = await session1.delete('filesystem');
      expect(deleteResult.success).toBe(true);

      const envId = session1.environmentId;
      expect(envId).toBeDefined();

      console.log(`✅ Session saved with environment ID: ${envId?.substring(0, 20)}...`);

      // Restore session
      const session2 = await client.createSession('agi-0', {
        restoreFromEnvironmentId: envId,
      });

      expect(session2).toBeDefined();
      expect(session2.sessionId).toBeDefined();

      console.log(`✅ Session restored from environment`);

      await session2.delete();
    }, 90000);
  });
});
