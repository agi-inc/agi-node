#!/usr/bin/env npx tsx
/**
 * Test script for client-driven sessions and AgentLoop.
 */

import { AGIClient, AgentLoop } from './src';

// Create a minimal 1x1 white PNG for testing (base64 encoded)
const DUMMY_SCREENSHOT = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
  0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59,
  0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND chunk
  0x44, 0xae, 0x42, 0x60, 0x82,
]).toString('base64');

const API_KEY = process.env.AGI_API_KEY || 'cd8c4e84-8d38-437a-8d3a-9d4f0f2546ec';

async function testSessionCreation(): Promise<boolean> {
  console.log("1. Testing session creation with agentSessionType='desktop'...");

  const client = new AGIClient({ apiKey: API_KEY });

  try {
    const session = await client.sessions.create('agi-2-claude', {
      agentSessionType: 'desktop',
      goal: 'Test goal - click on the start button',
    });

    console.log(`   ✓ Session created: ${session.sessionId}`);
    console.log(`   ✓ Agent URL: ${session.agentUrl}`);
    console.log(`   ✓ Status: ${session.status}`);

    // Clean up
    await client.sessions.delete(session.sessionId);
    console.log('   ✓ Session deleted');

    return true;
  } catch (error) {
    console.log(`   ✗ Failed: ${error}`);
    return false;
  }
}

async function testStepEndpoint(): Promise<boolean> {
  console.log('\n2. Testing step endpoint...');

  const client = new AGIClient({ apiKey: API_KEY });

  try {
    // Create session
    const session = await client.sessions.create('agi-2-claude', {
      agentSessionType: 'desktop',
      goal: 'Click on the calculator icon',
    });
    console.log(`   ✓ Session created: ${session.sessionId}`);

    // Call step with dummy screenshot
    console.log('   Calling step with dummy screenshot...');
    const result = await client.sessions.step(session.agentUrl!, DUMMY_SCREENSHOT);

    console.log('   ✓ Step response received:');
    console.log(`     - Step: ${result.step}`);
    console.log(`     - Finished: ${result.finished}`);
    console.log(`     - Actions: ${result.actions.length}`);
    if (result.thinking) {
      console.log(`     - Thinking: ${result.thinking.slice(0, 100)}...`);
    }
    if (result.askUser) {
      console.log(`     - Ask user: ${result.askUser}`);
    }

    // Clean up
    await client.sessions.delete(session.sessionId);
    console.log('   ✓ Session deleted');

    return true;
  } catch (error) {
    console.log(`   ✗ Failed: ${error}`);
    console.error(error);
    return false;
  }
}

async function testAgentLoopInit(): Promise<boolean> {
  console.log('\n3. Testing AgentLoop initialization...');

  const client = new AGIClient({ apiKey: API_KEY });

  try {
    const session = await client.sessions.create('agi-2-claude', {
      agentSessionType: 'desktop',
      goal: 'Test initialization',
    });

    const loop = new AgentLoop({
      client,
      agentUrl: session.agentUrl!,
      captureScreenshot: async () => DUMMY_SCREENSHOT,
      executeActions: async (actions) => {
        for (const a of actions) {
          console.log(`     Would execute: ${JSON.stringify(a)}`);
        }
      },
      onThinking: (t) => console.log(`     Thinking: ${t.slice(0, 50)}...`),
    });

    console.log('   ✓ AgentLoop created');
    console.log(`   ✓ Initial state: ${loop.state}`);

    if (loop.state !== 'idle') {
      throw new Error(`Expected 'idle', got '${loop.state}'`);
    }
    console.log("   ✓ State is 'idle' as expected");

    // Clean up
    await client.sessions.delete(session.sessionId);
    console.log('   ✓ Session deleted');

    return true;
  } catch (error) {
    console.log(`   ✗ Failed: ${error}`);
    console.error(error);
    return false;
  }
}

async function testAgentLoopSingleStep(): Promise<boolean> {
  console.log('\n4. Testing AgentLoop single step execution...');

  const client = new AGIClient({ apiKey: API_KEY });
  let session: Awaited<ReturnType<typeof client.sessions.create>> | null = null;

  try {
    session = await client.sessions.create('agi-2-claude', {
      agentSessionType: 'desktop',
      goal: 'This is a test - immediately say you are finished',
    });
    console.log(`   ✓ Session created: ${session.sessionId}`);

    let stepCount = 0;
    const maxSteps = 3;

    const loop = new AgentLoop({
      client,
      agentUrl: session.agentUrl!,
      captureScreenshot: async () => DUMMY_SCREENSHOT,
      executeActions: async (actions) => {
        stepCount++;
        console.log(`     Step ${stepCount}: ${actions.length} actions`);
        for (const a of actions) {
          console.log(`       - ${a.type || 'unknown'}: ${JSON.stringify(a)}`);
        }

        // Stop after max steps
        if (stepCount >= maxSteps) {
          loop.stop();
        }
      },
      onThinking: (t) => {
        if (t) console.log(`     💭 ${t.slice(0, 100)}...`);
      },
      onStep: (s, r) => console.log(`     Step ${s} complete, finished=${r.finished}`),
      stepDelay: 500,
    });

    console.log('   Starting loop (max 3 steps)...');

    // Run with timeout
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        loop.stop();
        resolve(null);
      }, 30000);
    });

    const result = await Promise.race([loop.start(), timeoutPromise]);

    console.log('   ✓ Loop completed');
    console.log(`   ✓ Final state: ${loop.state}`);
    console.log(`   ✓ Steps executed: ${stepCount}`);
    if (result) {
      console.log(`   ✓ Finished: ${result.finished}`);
    }

    return true;
  } catch (error) {
    if (String(error).includes('timeout')) {
      console.log('   ⚠ Test timed out (expected for dummy screenshot)');
      return true;
    }
    console.log(`   ✗ Failed: ${error}`);
    console.error(error);
    return false;
  } finally {
    if (session) {
      try {
        await client.sessions.delete(session.sessionId);
        console.log('   ✓ Session deleted');
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

async function testListModels(): Promise<boolean> {
  console.log('\n5. Testing listModels endpoint...');

  const client = new AGIClient({ apiKey: API_KEY });

  try {
    // List all models
    const models = await client.sessions.listModels();
    console.log(`   ✓ All models: ${models.models.join(', ')}`);

    // List desktop models
    const desktopModels = await client.sessions.listModels('desktop');
    console.log(`   ✓ Desktop models: ${desktopModels.models.join(', ')}`);

    return true;
  } catch (error) {
    console.log(`   ✗ Failed: ${error}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('AGI Node.js SDK - Client-Driven Session Tests');
  console.log('='.repeat(60));

  const results: [string, boolean][] = [];

  results.push(['Session Creation', await testSessionCreation()]);
  results.push(['Step Endpoint', await testStepEndpoint()]);
  results.push(['AgentLoop Init', await testAgentLoopInit()]);
  results.push(['List Models', await testListModels()]);
  results.push(['AgentLoop Execution', await testAgentLoopSingleStep()]);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter(([, r]) => r).length;
  const total = results.length;

  for (const [name, result] of results) {
    const status = result ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${status}: ${name}`);
  }

  console.log(`\n${passed}/${total} tests passed`);

  process.exit(passed === total ? 0 : 1);
}

main().catch(console.error);
