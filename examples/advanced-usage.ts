/**
 * Advanced usage example - webhooks, snapshots, multiple sessions
 */

import { AGIClient } from '../src';

const client = new AGIClient({
  apiKey: process.env.AGI_API_KEY || 'your-api-key-here',
});

async function main() {
  console.log('=== Advanced AGI SDK Usage ===\n');

  // 1. Create session with webhook
  console.log('1. Creating session with webhook...');
  const session1 = await client.createSession('agi-0-fast', {
    webhookUrl: 'https://yourapp.com/webhook',
    maxSteps: 200,
  });
  console.log(`   Session created: ${session1.sessionId}`);
  console.log(`   VNC URL: ${session1.vncUrl}\n`);

  try {
    // 2. List all sessions
    console.log('2. Listing all sessions...');
    const sessions = await client.listSessions();
    console.log(`   Found ${sessions.length} active session(s)\n`);

    // 3. Get session details
    console.log('3. Getting session details...');
    const sessionDetails = await client.getSession(session1.sessionId);
    console.log(`   Status: ${sessionDetails.status}`);
    console.log(`   Agent: ${sessionDetails.agentName}\n`);

    // 4. Send message and get status
    console.log('4. Sending message...');
    await session1.sendMessage('What is 2+2?');

    const status = await session1.getStatus();
    console.log(`   Status: ${status.status}\n`);

    // 5. Get message history
    console.log('5. Getting message history...');
    const messages = await session1.getMessages();
    console.log(`   Retrieved ${messages.messages.length} message(s)`);
    console.log(`   Session has agent: ${messages.hasAgent}\n`);

    // 6. Save snapshot for later restore
    console.log('6. Deleting session with snapshot...');
    const deleteResult = await session1.delete('filesystem');
    console.log(`   Deleted: ${deleteResult.deleted}`);
    console.log(`   Environment ID: ${session1.environmentId}\n`);

    // 7. Restore from snapshot (if needed)
    if (session1.environmentId) {
      console.log('7. Restoring from snapshot...');
      const session2 = await client.createSession('agi-0', {
        restoreFromEnvironmentId: session1.environmentId,
      });
      console.log(`   New session: ${session2.sessionId}`);
      console.log(`   Restored from: ${session1.environmentId}\n`);

      await session2.delete();
    }

  } catch (error) {
    console.error('Error:', error);
    if (session1.sessionId) {
      await session1.delete();
    }
  }

  console.log('=== Done ===');
}

main().catch(console.error);
