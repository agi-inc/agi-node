/**
 * Real-time event streaming example
 */

import { AGIClient } from '../src';

const client = new AGIClient({
  apiKey: process.env.AGI_API_KEY || 'your-api-key-here',
});

async function main() {
  const session = await client.createSession('agi-0');

  try {
    // Send a task
    await session.sendMessage('Research the latest developments in quantum computing');

    // Stream real-time events
    console.log('Streaming events...\n');

    for await (const event of session.streamEvents()) {
      if (event.event === 'thought') {
        console.log('💭 Agent thinking:', event.data);
      } else if (event.event === 'question') {
        console.log('❓ Agent question:', event.data);
      } else if (event.event === 'step') {
        console.log('👣 Agent step:', event.data);
      } else if (event.event === 'done') {
        console.log('\n✅ Task completed!');
        console.log('Result:', event.data);
        break;
      } else if (event.event === 'error') {
        console.error('\n❌ Task failed:', event.data);
        break;
      }
    }
  } finally {
    await session.delete();
  }
}

main().catch(console.error);
