/**
 * Debug SSE stream behavior
 */

import { AGIClient } from '../dist/index.js';

const API_KEY = 'f94a74fa-bcdf-429f-97b0-37b7a1df6ab2';

async function debugStream() {
  const client = new AGIClient({ apiKey: API_KEY });
  const session = await client.createSession('agi-0');

  try {
    console.log('Sending message...');
    await session.sendMessage('What is 2 + 2? Just give me the number.');

    console.log('\nStreaming events with includeHistory=false:');
    let count = 0;
    const maxEvents = 20;

    for await (const event of session.streamEvents({ includeHistory: false })) {
      count++;
      console.log(`Event ${count}: ${event.event}`, event.data ? JSON.stringify(event.data).substring(0, 100) : '');

      if (event.event === 'done' || event.event === 'error') {
        console.log('\n✅ Found completion event!');
        break;
      }

      if (count >= maxEvents) {
        console.log('\n⚠️  Reached max events without completion');
        break;
      }
    }

    console.log(`\nTotal events received: ${count}`);

    // Try with includeHistory=true
    console.log('\n\nTrying again with includeHistory=true:');
    await session.sendMessage('What is 3 + 3?');

    count = 0;
    for await (const event of session.streamEvents({ includeHistory: true })) {
      count++;
      console.log(`Event ${count}: ${event.event}`, event.data ? JSON.stringify(event.data).substring(0, 100) : '');

      if (event.event === 'done' || event.event === 'error') {
        console.log('\n✅ Found completion event!');
        break;
      }

      if (count >= maxEvents) {
        console.log('\n⚠️  Reached max events without completion');
        break;
      }
    }

    console.log(`\nTotal events received: ${count}`);

  } finally {
    await session.delete();
  }
}

debugStream().catch(console.error);
