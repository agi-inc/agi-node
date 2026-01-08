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
      expect(client.sessions).toBeDefined();
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

  describe('sessions.create', () => {
    it('should create session with default agent', async () => {
      const mockHttp = {
        request: vi.fn().mockResolvedValue({
          session_id: 'test-session',
          vnc_url: 'https://vnc.example.com',
          agent_name: 'agi-0',
          status: 'ready',
          created_at: new Date().toISOString(),
        }),
      };

      vi.mocked(HTTPClient).mockReturnValue(mockHttp as any);

      const client = new AGIClient({ apiKey: 'test-key' });
      const session = await client.sessions.create();

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
          session_id: 'test-session',
          vnc_url: 'https://vnc.example.com',
          agent_name: 'agi-0-fast',
          status: 'ready',
          created_at: new Date().toISOString(),
        }),
      };

      vi.mocked(HTTPClient).mockReturnValue(mockHttp as any);

      const client = new AGIClient({ apiKey: 'test-key' });
      const session = await client.sessions.create('agi-0-fast', {
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

  describe('sessions.list', () => {
    it('should list all sessions', async () => {
      const mockHttp = {
        request: vi.fn().mockResolvedValue([
          {
            session_id: 'session-1',
            vnc_url: 'https://vnc1.example.com',
            agent_name: 'agi-0',
            status: 'ready',
            created_at: new Date().toISOString(),
          },
          {
            session_id: 'session-2',
            vnc_url: 'https://vnc2.example.com',
            agent_name: 'agi-0',
            status: 'running',
            created_at: new Date().toISOString(),
          },
        ]),
      };

      vi.mocked(HTTPClient).mockReturnValue(mockHttp as any);

      const client = new AGIClient({ apiKey: 'test-key' });
      const sessions = await client.sessions.list();

      expect(mockHttp.request).toHaveBeenCalledWith('GET', '/v1/sessions');
      expect(sessions).toHaveLength(2);
      expect(sessions[0].sessionId).toBe('session-1');
      expect(sessions[1].sessionId).toBe('session-2');
    });
  });

  describe('sessions.get', () => {
    it('should get session by ID', async () => {
      const mockHttp = {
        request: vi.fn().mockResolvedValue({
          session_id: 'test-session',
          vnc_url: 'https://vnc.example.com',
          agent_name: 'agi-0',
          status: 'ready',
          created_at: new Date().toISOString(),
        }),
      };

      vi.mocked(HTTPClient).mockReturnValue(mockHttp as any);

      const client = new AGIClient({ apiKey: 'test-key' });
      const session = await client.sessions.get('test-session');

      expect(mockHttp.request).toHaveBeenCalledWith('GET', '/v1/sessions/test-session');
      expect(session.sessionId).toBe('test-session');
    });
  });

  describe('sessions.deleteAll', () => {
    it('should delete all sessions', async () => {
      const mockHttp = {
        request: vi.fn().mockResolvedValue({ deleted: true }),
      };

      vi.mocked(HTTPClient).mockReturnValue(mockHttp as any);

      const client = new AGIClient({ apiKey: 'test-key' });
      await client.sessions.deleteAll();

      expect(mockHttp.request).toHaveBeenCalledWith('DELETE', '/v1/sessions');
    });
  });

  describe('session() context manager', () => {
    it('should create SessionContext', () => {
      const client = new AGIClient({ apiKey: 'test-key' });
      const sessionContext = client.session('agi-0');

      expect(sessionContext).toBeDefined();
    });
  });
});
