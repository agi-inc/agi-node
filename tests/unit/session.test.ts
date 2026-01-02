/**
 * Unit tests for Session
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Session } from '../../src/session';
import type { HTTPClient } from '../../src/http';

describe('Session', () => {
  let mockHttp: HTTPClient;
  let session: Session;

  beforeEach(() => {
    mockHttp = {
      request: vi.fn(),
      streamEvents: vi.fn(),
    } as any;

    session = new Session(mockHttp, {
      sessionId: 'test-session',
      vncUrl: 'https://vnc.example.com',
      agentName: 'agi-0',
      status: 'ready',
      createdAt: new Date().toISOString(),
    });
  });

  describe('constructor', () => {
    it('should initialize with session data', () => {
      expect(session.sessionId).toBe('test-session');
      expect(session.vncUrl).toBe('https://vnc.example.com');
      expect(session.agentName).toBe('agi-0');
      expect(session.status).toBe('ready');
    });
  });

  describe('sendMessage', () => {
    it('should send message to session', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        success: true,
        message: 'Message sent',
      });

      const result = await session.sendMessage('Hello');

      expect(mockHttp.request).toHaveBeenCalledWith(
        'POST',
        '/v1/sessions/test-session/message',
        expect.objectContaining({
          json: expect.objectContaining({
            message: 'Hello',
          }),
        })
      );

      expect(result.success).toBe(true);
    });

    it('should send message with options', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        success: true,
        message: 'Message sent',
      });

      await session.sendMessage('Hello', {
        startUrl: 'https://example.com',
        configUpdates: { key: 'value' },
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        'POST',
        '/v1/sessions/test-session/message',
        expect.objectContaining({
          json: expect.objectContaining({
            message: 'Hello',
            start_url: 'https://example.com',
            config_updates: { key: 'value' },
          }),
        })
      );
    });
  });

  describe('getStatus', () => {
    it('should get session status', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        status: 'running',
      });

      const status = await session.getStatus();

      expect(mockHttp.request).toHaveBeenCalledWith('GET', '/v1/sessions/test-session/status');
      expect(status.status).toBe('running');
      expect(session.status).toBe('running'); // Should update local status
    });
  });

  describe('pause', () => {
    it('should pause session', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        success: true,
        message: 'Session paused',
      });

      const result = await session.pause();

      expect(mockHttp.request).toHaveBeenCalledWith('POST', '/v1/sessions/test-session/pause');
      expect(result.success).toBe(true);
    });
  });

  describe('resume', () => {
    it('should resume session', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        success: true,
        message: 'Session resumed',
      });

      const result = await session.resume();

      expect(mockHttp.request).toHaveBeenCalledWith('POST', '/v1/sessions/test-session/resume');
      expect(result.success).toBe(true);
    });
  });

  describe('cancel', () => {
    it('should cancel session', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        success: true,
        message: 'Session cancelled',
      });

      const result = await session.cancel();

      expect(mockHttp.request).toHaveBeenCalledWith('POST', '/v1/sessions/test-session/cancel');
      expect(result.success).toBe(true);
    });
  });

  describe('navigate', () => {
    it('should navigate to URL', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        currentUrl: 'https://example.com',
      });

      const result = await session.navigate('https://example.com');

      expect(mockHttp.request).toHaveBeenCalledWith(
        'POST',
        '/v1/sessions/test-session/navigate',
        expect.objectContaining({
          json: { url: 'https://example.com' },
        })
      );

      expect(result.currentUrl).toBe('https://example.com');
    });
  });

  describe('screenshot', () => {
    it('should take screenshot', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        screenshot: 'base64-data',
        url: 'https://example.com',
        title: 'Example Domain',
      });

      const result = await session.screenshot();

      expect(mockHttp.request).toHaveBeenCalledWith('GET', '/v1/sessions/test-session/screenshot');
      expect(result.screenshot).toBe('base64-data');
      expect(result.url).toBe('https://example.com');
      expect(result.title).toBe('Example Domain');
    });
  });

  describe('delete', () => {
    it('should delete session', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        success: true,
        deleted: true,
        message: 'Session deleted',
      });

      const result = await session.delete();

      expect(mockHttp.request).toHaveBeenCalledWith(
        'DELETE',
        '/v1/sessions/test-session',
        expect.objectContaining({
          query: {},
        })
      );

      expect(result.success).toBe(true);
    });

    it('should delete session with snapshot', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        success: true,
        deleted: true,
        message: 'Session deleted',
      });

      await session.delete('filesystem');

      expect(mockHttp.request).toHaveBeenCalledWith(
        'DELETE',
        '/v1/sessions/test-session',
        expect.objectContaining({
          query: { save_snapshot_mode: 'filesystem' },
        })
      );
    });
  });
});
