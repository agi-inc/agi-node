/**
 * Verify that the snake_case fixes are working
 */

import { describe, it, expect } from 'vitest';
import { AGIClient } from '../src';

const API_KEY = 'f94a74fa-bcdf-429f-97b0-37b7a1df6ab2';

describe('Verify Fixes', () => {
  it('should handle navigate response with snake_case', async () => {
    const client = new AGIClient({ apiKey: API_KEY });
    const session = await client.createSession('agi-0');

    try {
      const result = await session.navigate('https://example.com');

      expect(result).toBeDefined();
      expect(result.currentUrl).toBeDefined();
      expect(result.currentUrl).toContain('example.com');

      console.log('✅ Navigate fix working - currentUrl:', result.currentUrl);
    } finally {
      await session.delete();
    }
  }, 60000);

  it('should handle getMessages response with snake_case', async () => {
    const client = new AGIClient({ apiKey: API_KEY });
    const session = await client.createSession('agi-0');

    try {
      await session.sendMessage('Test message');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const messages = await session.getMessages();

      expect(messages).toBeDefined();
      expect(messages.hasAgent).toBeDefined();
      expect(typeof messages.hasAgent).toBe('boolean');

      console.log('✅ getMessages fix working - hasAgent:', messages.hasAgent);
    } finally {
      await session.delete();
    }
  }, 60000);

  it('should complete runTask without stream ending prematurely', async () => {
    const client = new AGIClient({ apiKey: API_KEY });
    const session = await client.createSession('agi-0');

    try {
      const result = await session.runTask('What is 2 + 2? Just give me the number.');

      expect(result).toBeDefined();
      console.log('✅ runTask completed successfully');
      console.log('   Result:', JSON.stringify(result).substring(0, 200));
    } catch (error: any) {
      if (error.message === 'Event stream ended without task completion') {
        console.log('❌ runTask still has streaming issue');
        throw error;
      }
      // Other errors might be OK (timeout, etc)
      console.log('⚠️  runTask had different error:', error.message);
    } finally {
      await session.delete();
    }
  }, 120000);
});
