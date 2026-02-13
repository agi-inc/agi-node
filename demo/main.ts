/**
 * AGI Node.js SDK Demo - Electron Main Process
 *
 * Creates AGIClient, exposes operations via IPC handlers,
 * and forwards SSE events to the renderer.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { AGIClient } from '../src';
import type {
  SessionResponse,
  SSEEvent,
  ScreenshotResponse,
} from '../src/types';

let mainWindow: BrowserWindow | null = null;
let client: AGIClient | null = null;
let activeStreamAbort: AbortController | null = null;
let screenshotInterval: ReturnType<typeof setInterval> | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'AGI SDK Demo',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopScreenshots();
  stopStream();
  if (client) {
    client = null;
  }
  app.quit();
});

// --- IPC Handlers ---

ipcMain.handle('connect', async (_event, apiKey: string) => {
  try {
    client = new AGIClient({ apiKey });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('list-models', async () => {
  if (!client) return { models: [] };
  try {
    const result = await client.sessions.listModels('cdp');
    return result;
  } catch {
    return { models: [] };
  }
});

ipcMain.handle('create-session', async (_event, agentName: string) => {
  if (!client) throw new Error('Not connected');
  const session = await client.sessions.create(agentName);
  return toPlain(session);
});

ipcMain.handle('list-sessions', async () => {
  if (!client) return [];
  const sessions = await client.sessions.list();
  return sessions.map(toPlain);
});

ipcMain.handle('delete-session', async (_event, sessionId: string) => {
  if (!client) throw new Error('Not connected');
  return await client.sessions.delete(sessionId);
});

ipcMain.handle(
  'send-message',
  async (_event, sessionId: string, message: string) => {
    if (!client) throw new Error('Not connected');
    return await client.sessions.sendMessage(sessionId, message);
  }
);

ipcMain.handle('pause-session', async (_event, sessionId: string) => {
  if (!client) throw new Error('Not connected');
  return await client.sessions.pause(sessionId);
});

ipcMain.handle('resume-session', async (_event, sessionId: string) => {
  if (!client) throw new Error('Not connected');
  return await client.sessions.resume(sessionId);
});

ipcMain.handle('cancel-session', async (_event, sessionId: string) => {
  if (!client) throw new Error('Not connected');
  return await client.sessions.cancel(sessionId);
});

ipcMain.handle('screenshot', async (_event, sessionId: string) => {
  if (!client) throw new Error('Not connected');
  const resp = await client.sessions.screenshot(sessionId);
  return toPlain(resp);
});

// --- SSE Streaming ---

ipcMain.on('start-stream', (_event, sessionId: string) => {
  stopStream();
  startStream(sessionId);
});

ipcMain.on('stop-stream', () => {
  stopStream();
});

async function startStream(sessionId: string) {
  if (!client || !mainWindow) return;

  activeStreamAbort = new AbortController();

  try {
    for await (const event of client.sessions.streamEvents(sessionId, {
      includeHistory: true,
    })) {
      if (activeStreamAbort.signal.aborted) break;
      mainWindow?.webContents.send('sse-event', toPlain(event));
      if (event.event === 'done' || event.event === 'error') break;
    }
  } catch (err: any) {
    if (!activeStreamAbort.signal.aborted) {
      mainWindow?.webContents.send('sse-error', err.message);
    }
  }

  mainWindow?.webContents.send('sse-ended');
}

function stopStream() {
  if (activeStreamAbort) {
    activeStreamAbort.abort();
    activeStreamAbort = null;
  }
}

// --- Screenshot polling ---

ipcMain.on('start-screenshots', (_event, sessionId: string) => {
  stopScreenshots();
  startScreenshots(sessionId);
});

ipcMain.on('stop-screenshots', () => {
  stopScreenshots();
});

function startScreenshots(sessionId: string) {
  if (!client || !mainWindow) return;

  screenshotInterval = setInterval(async () => {
    try {
      if (!client || !mainWindow) return;
      const resp = await client.sessions.screenshot(sessionId);
      mainWindow?.webContents.send('screenshot-update', toPlain(resp));
    } catch {
      // Silently ignore screenshot errors
    }
  }, 3000);
}

function stopScreenshots() {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
}

// Strip class instances to plain objects for IPC serialization
function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
