<div align="center">

<img src="https://cdn.prod.website-files.com/67be56277f6d514dcad939e2/67e48dd1cdab04c17a311669_logo-agi-white.png" alt="AGI" width="120"/>

<h1>AGI Node.js SDK</h1>

<p>
  <a href="https://www.npmjs.com/package/agi-sdk"><img src="https://img.shields.io/npm/v/agi-sdk?style=flat-square" alt="npm version"></a>
  <a href="https://github.com/agi-inc/agi-node/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/agi-inc/agi-node/ci.yml?branch=main&style=flat-square" alt="Build Status"></a>
  <a href="https://codecov.io/gh/agi-inc/agi-node"><img src="https://img.shields.io/codecov/c/github/agi-inc/agi-node?style=flat-square" alt="Coverage"></a>
  <a href="https://github.com/agi-inc/agi-node/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/agi-sdk?style=flat-square" alt="License"></a>
  <a href="https://www.npmjs.com/package/agi-sdk"><img src="https://img.shields.io/npm/dm/agi-sdk?style=flat-square" alt="Downloads"></a>
</p>

<p>
  <a href="https://www.theagi.company/">Website</a> •
  <a href="https://docs.agi.tech">Documentation</a> •
  <a href="https://platform.agi.tech">Platform</a> •
  <a href="https://theagi.company/blog">Blog</a>
</p>

---

**AI agent that actually works on the web.**

<br />

</div>

```typescript
import { AGIClient } from 'agi-sdk';

const client = new AGIClient({ apiKey: process.env.AGI_API_KEY });

// Context manager with automatic cleanup
await using session = client.session('agi-0');

const result = await session.runTask(
  'Find three nonstop flights from SFO to JFK next month under $450. ' +
  'Return flight times, airlines, and booking links.'
);

console.log(result.data);
console.log(`Duration: ${result.metadata.duration}s, Steps: ${result.metadata.steps}`);
// Session automatically deleted
```

<br />

> Powered by [AGI.tech](https://agi.tech) - the world's most capable computer agent. Trusted by [Visa](https://www.theagi.company/blog/agi-inc-visa) for agentic commerce. Evaluated with [REAL Bench](https://www.theagi.company/blog/introducing-real-bench).

<br />

## Installation

```bash
npm install agi-sdk
```

Get your API key at [platform.agi.tech](https://platform.agi.tech/api-keys)

```bash
export AGI_API_KEY="your-api-key"
```

## Quick Start

### Simple Task (Recommended)

```typescript
import { AGIClient } from 'agi-sdk';

const client = new AGIClient({ apiKey: process.env.AGI_API_KEY });

// Context manager with automatic cleanup
await using session = client.session('agi-0');

const result = await session.runTask('Find the cheapest iPhone 15 on Amazon');

console.log(result.data);             // Task output
console.log(result.metadata.duration); // Execution time in seconds
console.log(result.metadata.steps);    // Number of steps taken
// Session automatically deleted when scope exits
```

### Real-Time Event Streaming

```typescript
await using session = client.session('agi-0');

await session.sendMessage('Research the top 5 AI companies in 2025');

for await (const event of session.streamEvents()) {
  if (event.event === 'thought') {
    console.log('💭 Agent:', event.data);
  }
  if (event.event === 'done') {
    console.log('✅ Result:', event.data);
    break;
  }
}
// Session automatically deleted
```

### Polling Configuration

Configure timeouts and polling intervals for different task types:

```typescript
await using session = client.session('agi-0');

// Quick task (1 min timeout, 2s polling)
const result1 = await session.runTask('What is 2+2?', {
  timeout: 60000,
  pollInterval: 2000
});

// Complex task (15 min timeout, 5s polling)
const result2 = await session.runTask('Research AI companies...', {
  timeout: 900000,
  pollInterval: 5000
});
```

### Manual Session Management

For advanced use cases requiring fine-grained control:

```typescript
// Create session manually
const response = await client.sessions.create('agi-0', {
  webhookUrl: 'https://yourapp.com/webhook',
  maxSteps: 200
});

// Send message
await client.sessions.sendMessage(
  response.sessionId,
  'Find flights from SFO to JFK under $450'
);

// Check status
const status = await client.sessions.getStatus(response.sessionId);

// Delete when done
await client.sessions.delete(response.sessionId);
```

### Session Control

```typescript
await using session = client.session('agi-0');

await session.sendMessage('Long research task...');

// Control execution
await session.pause();    // Pause the agent
await session.resume();   // Resume later
await session.cancel();   // Or cancel
```

---

## Core Concepts

*Understanding the building blocks of agi-sdk*

### Sessions: The Container for Tasks

Every task runs inside a **session** - an isolated browser environment:

```typescript
// Recommended: Context manager (automatic cleanup)
await using session = client.session('agi-0');
await session.runTask('Find flights...');
// Session automatically deleted

// Alternative: Manual management
const response = await client.sessions.create('agi-0');
await client.sessions.delete(response.sessionId);
```

▸ Use context managers (`await using`) for automatic cleanup. Sessions consume resources and should be deleted when done.

### Available Agents

- **agi-0** - General purpose agent (recommended)
- **agi-0-fast** - Faster agent for simple tasks
- **agi-1** - Advanced agent with enhanced capabilities

See [docs.agi.tech](https://docs.agi.tech) for the full list.

---

## Features

- **Natural Language** - Describe tasks in plain English, no selectors or scraping code
- **Real-Time Streaming** - Watch agent execution live with Server-Sent Events
- **Session Control** - Pause, resume, or cancel long-running tasks
- **Browser Control** - Navigate and screenshot for visual debugging
- **Type-Safe** - Full TypeScript support with comprehensive type definitions
- **Production-Ready** - Built-in retries, automatic cleanup, comprehensive error handling

---

## Common Use Cases

### Price Monitoring

Monitor product prices and availability across retailers.

```typescript
const session = await client.createSession('agi-0');

try {
  const result = await session.runTask(
    'Go to amazon.com and search for "Sony WH-1000XM5". ' +
    'Get the current price, check if it\'s in stock, and return the product rating. ' +
    'Return as JSON with fields: price, in_stock, rating, url.'
  );
  console.log(result);
} finally {
  await session.delete();
}
```

### Lead Generation

Extract structured data from public sources.

```typescript
const session = await client.createSession('agi-0');

try {
  const result = await session.runTask(
    'Go to ycombinator.com/companies, find companies in the "AI" category ' +
    'from the latest batch. For the first 10 companies, get their name, ' +
    'description, and website. Return as a JSON array.'
  );
  console.log(result);
} finally {
  await session.delete();
}
```

### Flight Booking Research

```typescript
const session = await client.createSession('agi-0');

try {
  const result = await session.runTask(
    'Find three nonstop SFO→JFK flights next month under $450. ' +
    'Compare prices on Google Flights, Kayak, and Expedia. ' +
    'Return flight details and booking links.'
  );
  console.log(result);
} finally {
  await session.delete();
}
```

<details>
<summary><b>Browser Control</b> – Navigate and take screenshots for visual debugging</summary>

<br />

```typescript
const session = await client.createSession('agi-0');

try {
  // Navigate to specific URL
  await session.navigate('https://amazon.com');

  // Get screenshot for debugging
  const screenshot = await session.screenshot();
  console.log(screenshot.url);    // Current page URL
  console.log(screenshot.title);  // Page title
  // screenshot.screenshot contains base64 JPEG data
} finally {
  await session.delete();
}
```

</details>

<details>
<summary><b>Session Snapshots</b> – Preserve authentication and browser state</summary>

<br />

```typescript
// Create session and save environment
const session1 = await client.createSession('agi-0');
// ... do some authentication work ...
await session1.delete('filesystem');

// Later, restore from saved environment
const session2 = await client.createSession('agi-0', {
  restoreFromEnvironmentId: session1.environmentId,
});
// Authentication state and cookies preserved!

await session2.delete();
```

</details>

<details>
<summary><b>Advanced Session Management</b> – Full control over session lifecycle</summary>

<br />

```typescript
// Create session with options
const session = await client.createSession('agi-0-fast', {
  webhookUrl: 'https://yourapp.com/webhook',
  maxSteps: 200,
});

// Send message
await session.sendMessage('Find flights from SFO to JFK under $450');

// Check status
const status = await session.getStatus();
console.log(status.status);  // "running", "finished", etc.

// List all sessions
const sessions = await client.listSessions();

// Delete when done
await session.delete();
```

</details>

<details>
<summary><b>Webhooks</b> – Get notified when tasks complete</summary>

<br />

```typescript
const session = await client.createSession('agi-0', {
  webhookUrl: 'https://yourapp.com/webhook',
});

// Your webhook will receive events:
// POST https://yourapp.com/webhook
// {
//   "event": "done",
//   "session_id": "sess_...",
//   "data": {...}
// }
```

</details>

---

## Error Handling

<details>
<summary><b>Robust error handling with detailed debugging</b></summary>

<br />

```typescript
import {
  AGIClient,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  AgentExecutionError,
  AGIError,
} from 'agi-sdk';

const client = new AGIClient({ apiKey: process.env.AGI_API_KEY });

try {
  const session = await client.createSession('agi-0');
  try {
    const result = await session.runTask('Find flights...');
    console.log(result);
  } finally {
    await session.delete();
  }
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof NotFoundError) {
    console.error('Session not found');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded - please retry');
  } else if (error instanceof AgentExecutionError) {
    console.error('Task failed:', error.message);
    // Debug at VNC URL if available
  } else if (error instanceof AGIError) {
    console.error('API error:', error.message);
  }
}
```

</details>

---

## Documentation & Resources

**Learn More**
- [API Reference](https://docs.agi.tech) – Complete API documentation
- [Code Examples](./examples) – Working examples for common tasks
- [GitHub Issues](https://github.com/agi-inc/agi-node/issues) – Report bugs or request features

**Get Help**
- [Platform](https://platform.agi.tech) – Manage API keys and monitor usage
- [Documentation](https://docs.agi.tech) – Guides and tutorials

---

## TypeScript Support

This SDK is written in TypeScript and provides full type definitions:

```typescript
import type {
  Session,
  SessionStatus,
  SSEEvent,
  NavigateResponse
} from 'agi-sdk';

const session: Session = await client.createSession('agi-0');
const status: SessionStatus = (await session.getStatus()).status;
```

---

## Requirements

- Node.js 18 or higher
- TypeScript 5.0+ (for TypeScript users)

---

## License

MIT License - see [LICENSE](LICENSE) for details.
