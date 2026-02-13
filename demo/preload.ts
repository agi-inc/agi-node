/**
 * Preload script - exposes typed API to renderer via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

export interface AgiAPI {
  connect(apiKey: string): Promise<{ success: boolean; error?: string }>;
  listModels(): Promise<{ models: any[] }>;
  createSession(agentName: string): Promise<any>;
  listSessions(): Promise<any[]>;
  deleteSession(sessionId: string): Promise<any>;
  sendMessage(sessionId: string, message: string): Promise<any>;
  pauseSession(sessionId: string): Promise<any>;
  resumeSession(sessionId: string): Promise<any>;
  cancelSession(sessionId: string): Promise<any>;
  screenshot(sessionId: string): Promise<any>;
  startStream(sessionId: string): void;
  stopStream(): void;
  startScreenshots(sessionId: string): void;
  stopScreenshots(): void;
  onSSEEvent(callback: (event: any) => void): void;
  onSSEError(callback: (error: string) => void): void;
  onSSEEnded(callback: () => void): void;
  onScreenshotUpdate(callback: (data: any) => void): void;
}

const api: AgiAPI = {
  connect: (apiKey) => ipcRenderer.invoke('connect', apiKey),
  listModels: () => ipcRenderer.invoke('list-models'),
  createSession: (agentName) =>
    ipcRenderer.invoke('create-session', agentName),
  listSessions: () => ipcRenderer.invoke('list-sessions'),
  deleteSession: (sessionId) =>
    ipcRenderer.invoke('delete-session', sessionId),
  sendMessage: (sessionId, message) =>
    ipcRenderer.invoke('send-message', sessionId, message),
  pauseSession: (sessionId) =>
    ipcRenderer.invoke('pause-session', sessionId),
  resumeSession: (sessionId) =>
    ipcRenderer.invoke('resume-session', sessionId),
  cancelSession: (sessionId) =>
    ipcRenderer.invoke('cancel-session', sessionId),
  screenshot: (sessionId) => ipcRenderer.invoke('screenshot', sessionId),
  startStream: (sessionId) => ipcRenderer.send('start-stream', sessionId),
  stopStream: () => ipcRenderer.send('stop-stream'),
  startScreenshots: (sessionId) =>
    ipcRenderer.send('start-screenshots', sessionId),
  stopScreenshots: () => ipcRenderer.send('stop-screenshots'),
  onSSEEvent: (callback) =>
    ipcRenderer.on('sse-event', (_e, event) => callback(event)),
  onSSEError: (callback) =>
    ipcRenderer.on('sse-error', (_e, error) => callback(error)),
  onSSEEnded: (callback) => ipcRenderer.on('sse-ended', () => callback()),
  onScreenshotUpdate: (callback) =>
    ipcRenderer.on('screenshot-update', (_e, data) => callback(data)),
};

contextBridge.exposeInMainWorld('agi', api);
