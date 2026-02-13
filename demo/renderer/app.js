/**
 * AGI SDK Demo - Renderer Process (compiled from app.ts)
 * Vanilla JS, no framework dependencies.
 */

const agi = window.agi;

// --- State ---
let connected = false;
let activeSessionId = null;
const sessions = new Map();

// --- DOM Elements ---
const $ = (id) => document.getElementById(id);
const apiKeyInput = $('apiKeyInput');
const connectBtn = $('connectBtn');
const agentSelect = $('agentSelect');
const newSessionBtn = $('newSessionBtn');
const sessionListEl = $('sessionList');
const deleteBtn = $('deleteBtn');
const screenshotImg = $('screenshotImg');
const screenshotPlaceholder = $('screenshotPlaceholder');
const pauseBtn = $('pauseBtn');
const resumeBtn = $('resumeBtn');
const cancelBtn = $('cancelBtn');
const eventContainer = $('eventContainer');
const taskInput = $('taskInput');
const sendBtn = $('sendBtn');
const connectionStatus = $('connectionStatus');
const sessionStatus = $('sessionStatus');
const runStatus = $('runStatus');

// --- Event Icons ---
const EVENT_ICONS = {
  thought: '\u{1F4AD}',
  step: '\u25B6',
  question: '\u2753',
  done: '\u2705',
  error: '\u274C',
  log: '\u{1F4CB}',
  paused: '\u23F8',
  resumed: '\u25B6',
  user: '\u{1F464}',
};

// --- Connect ---
connectBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key) return;

  connectBtn.disabled = true;
  const result = await agi.connect(key);

  if (result.success) {
    connected = true;
    connectBtn.textContent = 'Connected';
    apiKeyInput.disabled = true;
    newSessionBtn.disabled = false;
    connectionStatus.innerHTML = '&#x1F7E2; Connected';
    connectionStatus.style.color = '#2ecc71';

    // Load models
    try {
      const modelsResp = await agi.listModels();
      if (modelsResp.models && modelsResp.models.length) {
        agentSelect.innerHTML = '';
        for (const m of modelsResp.models) {
          const name = m.name || m;
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          agentSelect.appendChild(opt);
        }
      }
    } catch (e) { /* ignore */ }

    // Load existing sessions
    try {
      const existingSessions = await agi.listSessions();
      for (const s of existingSessions) {
        addSessionToList(s.sessionId, s.agentName, s.status);
      }
    } catch (e) { /* ignore */ }
  } else {
    connectBtn.disabled = false;
    addEvent('error', 'Connection failed: ' + result.error);
  }
});

// --- New Session ---
newSessionBtn.addEventListener('click', async () => {
  if (!connected) return;
  const agentName = agentSelect.value;
  addEvent('log', 'Creating session with ' + agentName + '...');

  try {
    const session = await agi.createSession(agentName);
    addSessionToList(session.sessionId, session.agentName, session.status);
    addEvent('log', 'Session created: ' + session.sessionId.slice(0, 8) + '...');
  } catch (err) {
    addEvent('error', 'Failed to create session: ' + err.message);
  }
});

// --- Delete Session ---
deleteBtn.addEventListener('click', async () => {
  if (!activeSessionId) return;
  const id = activeSessionId;

  try {
    agi.stopStream();
    agi.stopScreenshots();
    await agi.deleteSession(id);
    removeSessionFromList(id);
    if (activeSessionId === id) {
      activeSessionId = null;
      sessionStatus.textContent = 'Session: --';
      taskInput.disabled = true;
      sendBtn.disabled = true;
      deleteBtn.disabled = true;
      setControlState('idle');
      screenshotImg.style.display = 'none';
      screenshotPlaceholder.style.display = '';
    }
    addEvent('log', 'Session deleted');
  } catch (err) {
    addEvent('error', 'Delete failed: ' + err.message);
  }
});

// --- Session Selection ---
function selectSession(sessionId) {
  if (sessionId === activeSessionId) return;

  agi.stopStream();
  agi.stopScreenshots();

  activeSessionId = sessionId;
  sessionStatus.textContent = 'Session: ' + sessionId.slice(0, 8) + '...';
  taskInput.disabled = false;
  sendBtn.disabled = false;
  deleteBtn.disabled = false;
  eventContainer.innerHTML = '';
  screenshotImg.style.display = 'none';
  screenshotPlaceholder.style.display = '';

  document.querySelectorAll('.session-item').forEach((el) => {
    el.classList.toggle('selected', el.getAttribute('data-id') === sessionId);
  });

  addEvent('log', 'Selected session ' + sessionId.slice(0, 8) + '...');

  agi.startStream(sessionId);
  agi.startScreenshots(sessionId);
}

// --- Task Submit ---
sendBtn.addEventListener('click', submitTask);
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitTask();
});

async function submitTask() {
  const text = taskInput.value.trim();
  if (!text || !activeSessionId) return;

  addEvent('user', text);
  taskInput.value = '';
  setControlState('running');
  setRunStatus('running');

  try {
    await agi.sendMessage(activeSessionId, text);
    addEvent('log', 'Message sent to agent');
  } catch (err) {
    addEvent('error', 'Send failed: ' + err.message);
  }
}

// --- Session Controls ---
pauseBtn.addEventListener('click', async () => {
  if (!activeSessionId) return;
  try {
    await agi.pauseSession(activeSessionId);
    setControlState('paused');
    setRunStatus('paused');
    addEvent('log', 'Session paused');
  } catch (err) {
    addEvent('error', 'Pause failed: ' + err.message);
  }
});

resumeBtn.addEventListener('click', async () => {
  if (!activeSessionId) return;
  try {
    await agi.resumeSession(activeSessionId);
    setControlState('running');
    setRunStatus('running');
    addEvent('log', 'Session resumed');
  } catch (err) {
    addEvent('error', 'Resume failed: ' + err.message);
  }
});

cancelBtn.addEventListener('click', async () => {
  if (!activeSessionId) return;
  try {
    await agi.cancelSession(activeSessionId);
    setControlState('idle');
    setRunStatus('ready');
    addEvent('log', 'Session cancelled');
  } catch (err) {
    addEvent('error', 'Cancel failed: ' + err.message);
  }
});

// --- Quick Cards ---
document.querySelectorAll('.quick-card').forEach((btn) => {
  btn.addEventListener('click', () => {
    const task = btn.getAttribute('data-task');
    if (task) {
      taskInput.value = task;
      taskInput.focus();
    }
  });
});

// --- SSE Event Handlers ---
agi.onSSEEvent((event) => {
  const eventType = event.event || 'unknown';
  const data = event.data || {};
  let content = data.content || data.message || data.text || JSON.stringify(data);
  if (typeof content !== 'string') content = JSON.stringify(content);
  if (content.length > 300) content = content.slice(0, 300) + '...';

  addEvent(eventType, content);

  if (eventType === 'done') {
    setControlState('idle');
    setRunStatus('finished');
  } else if (eventType === 'error') {
    setControlState('idle');
    setRunStatus('error');
  } else if (eventType === 'paused') {
    setControlState('paused');
    setRunStatus('paused');
  } else if (eventType === 'resumed') {
    setControlState('running');
    setRunStatus('running');
  }
});

agi.onSSEError((error) => {
  addEvent('error', 'Stream error: ' + error);
});

agi.onSSEEnded(() => {
  addEvent('log', 'Stream ended');
});

// --- Screenshot Handler ---
agi.onScreenshotUpdate((data) => {
  if (data.screenshot) {
    let src = data.screenshot;
    if (!src.startsWith('data:')) {
      src = 'data:image/jpeg;base64,' + src;
    }
    screenshotImg.src = src;
    screenshotImg.style.display = '';
    screenshotPlaceholder.style.display = 'none';
  }
});

// --- Helper Functions ---

function addSessionToList(sessionId, agentName, status) {
  sessions.set(sessionId, { agentName, status });

  const item = document.createElement('div');
  item.className = 'session-item';
  item.setAttribute('data-id', sessionId);
  item.innerHTML =
    '<span class="session-agent">' + escapeHtml(agentName) + '</span> ' +
    '<span class="session-status">(' + escapeHtml(status) + ')</span>';
  item.addEventListener('click', () => selectSession(sessionId));
  sessionListEl.appendChild(item);
}

function removeSessionFromList(sessionId) {
  sessions.delete(sessionId);
  const item = sessionListEl.querySelector('[data-id="' + sessionId + '"]');
  if (item) item.remove();
}

function addEvent(type, content) {
  const icon = EVENT_ICONS[type] || '\u2022';
  const item = document.createElement('div');
  item.className = 'event-item';
  item.innerHTML =
    '<span class="event-type ' + type + '">' + icon + ' [' + type + ']</span>' +
    '<span class="event-content">' + escapeHtml(content) + '</span>';
  eventContainer.appendChild(item);
  eventContainer.scrollTop = eventContainer.scrollHeight;
}

function setControlState(state) {
  const running = state === 'running';
  const paused = state === 'paused';
  pauseBtn.disabled = !running;
  resumeBtn.disabled = !paused;
  cancelBtn.disabled = !(running || paused);
}

function setRunStatus(status) {
  const colors = {
    running: '#2ecc71',
    paused: '#f39c12',
    error: '#e74c3c',
    finished: '#3498db',
    ready: '#95a5a6',
  };
  runStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  runStatus.style.color = colors[status] || '#888';
  runStatus.style.fontWeight = 'bold';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
