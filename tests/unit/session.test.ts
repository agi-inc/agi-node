/**
 * Unit tests for SessionsResource
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionsResource } from '../../src/resources/sessions';
import type { HTTPClient } from '../../src/http';

describe('SessionsResource', () => {
  let mockHttp: HTTPClient;
  let sessions: SessionsResource;

  beforeEach(() => {
    mockHttp = {
      request: vi.fn(),
      streamEvents: vi.fn(),
    } as any;

    sessions = new SessionsResource(mockHttp);
  });

  describe('create', () => {
    it('should create session with default options', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        session_id: 'test-session',
        vnc_url: 'https://vnc.example.com',
        agent_name: 'agi-0',
        status: 'ready',
        created_at: new Date().toISOString(),
      });

      const result = await sessions.create();

      expect(mockHttp.request).toHaveBeenCalledWith('POST', '/v1/sessions', {
        json: {
          agent_name: 'agi-0',
          max_steps: 100,
        },
      });

      expect(result.sessionId).toBe('test-session');
      expect(result.vncUrl).toBe('https://vnc.example.com');
    });

    it('should create session with custom options', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        session_id: 'custom-session',
        vnc_url: 'https://vnc.example.com',
        agent_name: 'agi-0-fast',
        status: 'ready',
        created_at: new Date().toISOString(),
      });

      const result = await sessions.create('agi-0-fast', {
        webhookUrl: 'https://example.com/webhook',
        maxSteps: 200,
        goal: 'Test goal',
      });

      expect(mockHttp.request).toHaveBeenCalledWith('POST', '/v1/sessions', {
        json: {
          agent_name: 'agi-0-fast',
          max_steps: 200,
          webhook_url: 'https://example.com/webhook',
          goal: 'Test goal',
        },
      });

      expect(result.sessionId).toBe('custom-session');
    });
  });

  describe('list', () => {
    it('should list all sessions', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue([
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
      ]);

      const result = await sessions.list();

      expect(mockHttp.request).toHaveBeenCalledWith('GET', '/v1/sessions');
      expect(result).toHaveLength(2);
      expect(result[0].sessionId).toBe('session-1');
      expect(result[1].sessionId).toBe('session-2');
    });
  });

  describe('get', () => {
    it('should get session by ID', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        session_id: 'test-session',
        vnc_url: 'https://vnc.example.com',
        agent_name: 'agi-0',
        status: 'ready',
        created_at: new Date().toISOString(),
      });

      const result = await sessions.get('test-session');

      expect(mockHttp.request).toHaveBeenCalledWith('GET', '/v1/sessions/test-session');
      expect(result.sessionId).toBe('test-session');
    });
  });

  describe('delete', () => {
    it('should delete session', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({ deleted: true });

      await sessions.delete('test-session');

      expect(mockHttp.request).toHaveBeenCalledWith('DELETE', '/v1/sessions/test-session', {
        query: { save_snapshot_mode: 'none' },
      });
    });

    it('should delete session with snapshot mode', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({ deleted: true });

      await sessions.delete('test-session', 'filesystem');

      expect(mockHttp.request).toHaveBeenCalledWith('DELETE', '/v1/sessions/test-session', {
        query: { save_snapshot_mode: 'filesystem' },
      });
    });
  });

  describe('deleteAll', () => {
    it('should delete all sessions', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({ deleted: true, count: 5 });

      await sessions.deleteAll();

      expect(mockHttp.request).toHaveBeenCalledWith('DELETE', '/v1/sessions');
    });
  });

  describe('sendMessage', () => {
    it('should send message to session', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({ success: true });

      await sessions.sendMessage('test-session', 'Hello');

      expect(mockHttp.request).toHaveBeenCalledWith('POST', '/v1/sessions/test-session/message', {
        json: {
          message: 'Hello',
          start_url: undefined,
          config_updates: undefined,
        },
      });
    });

    it('should send message with options', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({ success: true });

      await sessions.sendMessage('test-session', 'Hello', {
        startUrl: 'https://example.com',
      });

      expect(mockHttp.request).toHaveBeenCalledWith('POST', '/v1/sessions/test-session/message', {
        json: {
          message: 'Hello',
          start_url: 'https://example.com',
          config_updates: undefined,
        },
      });
    });
  });

  describe('getStatus', () => {
    it('should get session status', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({ status: 'running' });

      const result = await sessions.getStatus('test-session');

      expect(mockHttp.request).toHaveBeenCalledWith('GET', '/v1/sessions/test-session/status');
      expect(result.status).toBe('running');
    });
  });

  describe('getMessages', () => {
    it('should get messages', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        messages: [{ id: 1, type: 'THOUGHT', content: 'Test' }],
        status: 'running',
        has_agent: true,
      });

      const result = await sessions.getMessages('test-session');

      expect(mockHttp.request).toHaveBeenCalledWith('GET', '/v1/sessions/test-session/messages', {
        query: {
          after_id: '0',
          sanitize: 'true',
        },
      });

      expect(result.messages).toHaveLength(1);
      expect(result.hasAgent).toBe(true);
    });

    it('should get messages with afterId', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        messages: [],
        status: 'running',
        has_agent: true,
      });

      await sessions.getMessages('test-session', 5);

      expect(mockHttp.request).toHaveBeenCalledWith('GET', '/v1/sessions/test-session/messages', {
        query: {
          after_id: '5',
          sanitize: 'true',
        },
      });
    });
  });

  describe('pause', () => {
    it('should pause session', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({ success: true });

      await sessions.pause('test-session');

      expect(mockHttp.request).toHaveBeenCalledWith('POST', '/v1/sessions/test-session/pause');
    });
  });

  describe('resume', () => {
    it('should resume session', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({ success: true });

      await sessions.resume('test-session');

      expect(mockHttp.request).toHaveBeenCalledWith('POST', '/v1/sessions/test-session/resume');
    });
  });

  describe('cancel', () => {
    it('should cancel session', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({ success: true });

      await sessions.cancel('test-session');

      expect(mockHttp.request).toHaveBeenCalledWith('POST', '/v1/sessions/test-session/cancel');
    });
  });

  describe('navigate', () => {
    it('should navigate to URL', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        current_url: 'https://example.com',
      });

      const result = await sessions.navigate('test-session', 'https://example.com');

      expect(mockHttp.request).toHaveBeenCalledWith('POST', '/v1/sessions/test-session/navigate', {
        json: { url: 'https://example.com' },
      });

      expect(result.currentUrl).toBe('https://example.com');
    });
  });

  describe('screenshot', () => {
    it('should get screenshot', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        screenshot: 'base64data',
        url: 'https://example.com',
        title: 'Example',
      });

      const result = await sessions.screenshot('test-session');

      expect(mockHttp.request).toHaveBeenCalledWith('GET', '/v1/sessions/test-session/screenshot');
      expect(result.screenshot).toBe('base64data');
    });
  });
});
