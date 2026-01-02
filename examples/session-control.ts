/**
 * Session control example - pause, resume, cancel
 */

import { AGIClient } from '../src';

const client = new AGIClient({
  apiKey: process.env.AGI_API_KEY || 'your-api-key-here',
});

async function main() {
  const session = await client.createSession('agi-0');

  try {
    // Start a long-running task
    await session.sendMessage('Research the top 5 AI companies in 2025. For each, find: ' +
      'company name, CEO, employee count, recent funding, and main products.');

    // Wait a bit for task to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Pause the session
    console.log('Pausing session...');
    await session.pause();
    const status1 = await session.getStatus();
    console.log('Status after pause:', status1.status);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Resume the session
    console.log('Resuming session...');
    await session.resume();
    const status2 = await session.getStatus();
    console.log('Status after resume:', status2.status);

    // Or cancel the session entirely
    // await session.cancel();
    // console.log('Session cancelled');

  } finally {
    await session.delete();
  }
}

main().catch(console.error);
