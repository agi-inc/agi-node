/**
 * Remote browser agent quickstart
 *
 * Demonstrates the full SDK workflow: create a session, send a task
 * with real-time event streaming, take a screenshot, pause/resume,
 * and clean up.
 *
 * Usage:
 *   AGI_API_KEY=sk-... npx ts-node examples/basic/quickstart-remote.ts
 */

import { AGIClient } from '../../src';

const client = new AGIClient({ apiKey: process.env.AGI_API_KEY || 'your-api-key' });

async function main() {
  // --- Low-level API (explicit lifecycle) ---

  // 1. Create a remote browser session
  const session = await client.sessions.create('agi-0');
  console.log(`Session ID: ${session.sessionId}`);
  console.log(`Status: ${session.status}\n`);

  // 2. Send a task and stream events
  await client.sessions.sendMessage(
    session.sessionId,
    'What is the current time? Search Google to find out.'
  );

  for await (const event of client.sessions.streamEvents(session.sessionId)) {
    const eventType = event.event;
    let content = '';

    if (event.data) {
      const data = event.data as Record<string, unknown>;
      if (typeof data === 'object') {
        content = String(data.content || data.message || data.text || JSON.stringify(data));
      } else {
        content = String(data);
      }
    }

    switch (eventType) {
      case 'thought':
        console.log(`  Thought: ${content.slice(0, 100)}`);
        break;
      case 'step':
        console.log(`  Step: ${content.slice(0, 100)}`);
        break;
      case 'done':
        console.log(`\n  Done: ${content.slice(0, 200)}`);
        break;
      case 'error':
        console.log(`\n  Error: ${content}`);
        break;
      case 'question':
        console.log(`  Agent asks: ${content}`);
        break;
    }

    if (eventType === 'done' || eventType === 'error') break;
  }

  // 3. Take a screenshot
  const screenshot = await client.sessions.screenshot(session.sessionId);
  const imgData = screenshot.screenshot.includes(',')
    ? screenshot.screenshot.split(',')[1]
    : screenshot.screenshot;
  const buffer = Buffer.from(imgData, 'base64');
  console.log(`\nScreenshot captured (${buffer.length} bytes)`);

  // 4. Session control
  await client.sessions.pause(session.sessionId);
  console.log('Session paused');

  await client.sessions.resume(session.sessionId);
  console.log('Session resumed');

  // 5. Cleanup
  await client.sessions.delete(session.sessionId);
  console.log('Session deleted\n');

  // --- High-level API (recommended) ---

  console.log('--- High-level API ---');
  {
    await using session = client.session('agi-0');
    const result = await session.runTask('Search for the latest Node.js LTS version');
    console.log(`Result: ${result.data}`);
    console.log(`Duration: ${result.metadata.duration}s`);
    console.log(`Steps: ${result.metadata.steps}`);
  }
  // Session automatically deleted when scope exits
}

main().catch(console.error);
