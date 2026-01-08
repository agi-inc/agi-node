/**
 * Quickstart example - matches documentation
 */

import { AGIClient } from '../../src';

const client = new AGIClient({ apiKey: process.env.AGI_API_KEY || 'your-api-key' });

async function main() {
  // Context manager with automatic cleanup
  await using session = client.session('agi-0');

  const result = await session.runTask(
    'Find three nonstop flights from SFO to JFK next month under $450. ' +
      'Return flight times, airlines, and booking links.'
  );

  console.log('Result:', result.data);
  console.log(`\nCompleted in ${result.metadata.duration.toFixed(2)}s`);
  console.log(`Steps taken: ${result.metadata.steps}`);
  console.log(`Success: ${result.metadata.success}`);

  // Session automatically deleted when scope exits
}

main().catch(console.error);
