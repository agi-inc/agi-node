/**
 * Unit tests for AGIClient
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AGIClient } from '../../src/client';
import { HTTPClient } from '../../src/http';

vi.mock('../../src/http');

describe('AGIClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with API key', () => {
      const client = new AGIClient({ apiKey: 'test-key' });
      expect(client).toBeDefined();
    });

    it('should throw error without API key', () => {
      expect(() => new AGIClient({ apiKey: '' })).toThrow();
    });

    it('should use default base URL', () => {
      const client = new AGIClient({ apiKey: 'test-key' });
      expect(HTTPClient).toHaveBeenCalledWith({
        apiKey: 'test-key',
      });
    });

    it('should accept custom base URL', () => {
      const client = new AGIClient({
        apiKey: 'test-key',
        baseUrl: 'https://custom.api.com',
      });

      expect(HTTPClient).toHaveBeenCalledWith({
        apiKey: 'test-key',
        baseUrl: 'https://custom.api.com',
      });
    });

    it('should accept custom timeout', () => {
      const client = new AGIClient({
        apiKey: 'test-key',
        timeout: 120000,
      });

      expect(HTTPClient).toHaveBeenCalledWith({
        apiKey: 'test-key',
        timeout: 120000,
      });
    });
  });

  describe('createSession', () => {
    it('should create session with default agent', async () => {
      const mockHttp = {
        request: vi.fn().mockResolvedValue({
          sessionId: 'test-session',
          vncUrl: 'https://vnc.example.com',
          agentName: 'agi-0',
          status: 'ready',
          createdAt: new Date().toISOString(),
        }),
      };

      vi.mocked(HTTPClient).mockReturnValue(mockHttp as any);

      const client = new AGIClient({ apiKey: 'test-key' });
      const session = await client.createSession();

      expect(mockHttp.request).toHaveBeenCalledWith(
        'POST',
        '/v1/sessions',
        expect.objectContaining({
          json: expect.objectContaining({
            agent_name: 'agi-0',
            max_steps: 100,
          }),
        })
      );

      expect(session.sessionId).toBe('test-session');
    });

    it('should create session with custom agent and options', async () => {
      const mockHttp = {
        request: vi.fn().mockResolvedValue({
          sessionId: 'test-session',
          vncUrl: 'https://vnc.example.com',
          agentName: 'agi-0-fast',
          status: 'ready',
          createdAt: new Date().toISOString(),
        }),
      };

      vi.mocked(HTTPClient).mockReturnValue(mockHttp as any);

      const client = new AGIClient({ apiKey: 'test-key' });
      const session = await client.createSession('agi-0-fast', {
        webhookUrl: 'https://example.com/webhook',
        maxSteps: 200,
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        'POST',
        '/v1/sessions',
        expect.objectContaining({
          json: expect.objectContaining({
            agent_name: 'agi-0-fast',
            max_steps: 200,
            webhook_url: 'https://example.com/webhook',
          }),
        })
      );
    });
  });

  describe('listSessions', () => {
    it('should list all sessions', async () => {
      const mockHttp = {
        request: vi.fn().mockResolvedValue([
          {
            sessionId: 'session-1',
            vncUrl: 'https://vnc1.example.com',
            agentName: 'agi-0',
            status: 'ready',
            createdAt: new Date().toISOString(),
          },
          {
            sessionId: 'session-2',
            vncUrl: 'https://vnc2.example.com',
            agentName: 'agi-0',
            status: 'running',
            createdAt: new Date().toISOString(),
          },
        ]),
      };

      vi.mocked(HTTPClient).mockReturnValue(mockHttp as any);

      const client = new AGIClient({ apiKey: 'test-key' });
      const sessions = await client.listSessions();

      expect(mockHttp.request).toHaveBeenCalledWith('GET', '/v1/sessions');
      expect(sessions).toHaveLength(2);
      expect(sessions[0].sessionId).toBe('session-1');
      expect(sessions[1].sessionId).toBe('session-2');
    });
  });

  describe('getSession', () => {
    it('should get session by ID', async () => {
      const mockHttp = {
        request: vi.fn().mockResolvedValue({
          sessionId: 'test-session',
          vncUrl: 'https://vnc.example.com',
          agentName: 'agi-0',
          status: 'ready',
          createdAt: new Date().toISOString(),
        }),
      };

      vi.mocked(HTTPClient).mockReturnValue(mockHttp as any);

      const client = new AGIClient({ apiKey: 'test-key' });
      const session = await client.getSession('test-session');

      expect(mockHttp.request).toHaveBeenCalledWith('GET', '/v1/sessions/test-session');
      expect(session.sessionId).toBe('test-session');
    });
  });

  describe('deleteAllSessions', () => {
    it('should delete all sessions', async () => {
      const mockHttp = {
        request: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(HTTPClient).mockReturnValue(mockHttp as any);

      const client = new AGIClient({ apiKey: 'test-key' });
      await client.deleteAllSessions();

      expect(mockHttp.request).toHaveBeenCalledWith('DELETE', '/v1/sessions');
    });
  });
});
