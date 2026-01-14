#!/usr/bin/env npx tsx
/**
 * Quick test against dev.api.agi.tech.
 */
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { AGIClient } from './src';

const API_KEY = process.env.AGI_API_KEY || '93c41aee-a4c8-4b25-bbae-98e86701eb80';
const BASE_URL = 'https://dev.api.agi.tech';
const SCREENSHOT_PATH = join(homedir(), 'Desktop', 'app.png');

function loadScreenshot(): string {
  return readFileSync(SCREENSHOT_PATH).toString('base64');
}

async function main() {
  const client = new AGIClient({ apiKey: API_KEY, baseUrl: BASE_URL });

  console.log('Testing CDP (agi-0)...');
  let session = await client.sessions.create('agi-0', { agentSessionType: 'managed-cdp' });
  console.log(`  ✓ CDP session: ${session.sessionId}`);
  await client.sessions.delete(session.sessionId);
  console.log('  ✓ Deleted');

  console.log('\nTesting Desktop (agi-2-claude)...');
  session = await client.sessions.create('agi-2-claude', {
    agentSessionType: 'desktop',
    goal: 'Click on calculator',
  });
  console.log(`  ✓ Desktop session: ${session.sessionId}`);
  console.log(`  ✓ Agent URL: ${session.agentUrl}`);

  const screenshot = loadScreenshot();
  console.log(`  Calling step (${screenshot.length} bytes)...`);
  const result = await client.sessions.step(session.agentUrl!, screenshot);
  console.log(`  ✓ Step ${result.step}: ${result.actions.length} actions, finished=${result.finished}`);
  if (result.actions.length > 0) {
    console.log(`    First action: ${JSON.stringify(result.actions[0])}`);
  }

  await client.sessions.delete(session.sessionId);
  console.log('  ✓ Deleted');
  console.log('\n✅ All tests passed!');
}

main().catch(console.error);
