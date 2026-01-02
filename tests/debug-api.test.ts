/**
 * Debug test to investigate API response structure
 */

import { describe, it } from 'vitest';
import { AGIClient } from '../src';

const API_KEY = 'f94a74fa-bcdf-429f-97b0-37b7a1df6ab2';

describe('API Response Debug', () => {
  it('should show raw API response', async () => {
    const client = new AGIClient({ apiKey: API_KEY });

    console.log('Creating session...');
    const session = await client.createSession('agi-0');

    console.log('\n=== RAW SESSION OBJECT ===');
    console.log(JSON.stringify(session, null, 2));

    console.log('\n=== SESSION PROPERTIES ===');
    console.log('sessionId:', session.sessionId);
    console.log('vncUrl:', session.vncUrl);
    console.log('agentName:', session.agentName);
    console.log('status:', session.status);
    console.log('createdAt:', session.createdAt);
    console.log('environmentId:', session.environmentId);

    await session.delete();
  }, 60000);
});
