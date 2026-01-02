/**
 * Quickstart example - matches documentation exactly
 */

import { AGIClient } from '../src';

// Initialize client (API key from environment or explicit)
const client = new AGIClient({
  apiKey: process.env.AGI_API_KEY || 'your-api-key-here',
});

async function main() {
  // Create session
  const session = await client.createSession('agi-0');

  try {
    // Run task with natural language
    const result = await session.runTask(
      'Find three nonstop flights from SFO to JFK next month under $450. ' +
        'Return flight times, airlines, and booking links.'
    );

    console.log('Result:', result);
  } finally {
    // Always clean up
    await session.delete();
  }
}

main().catch(console.error);
