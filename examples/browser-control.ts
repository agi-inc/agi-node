/**
 * Browser control example - navigate and screenshot
 */

import { AGIClient } from '../src';

const client = new AGIClient({
  apiKey: process.env.AGI_API_KEY || 'your-api-key-here',
});

async function main() {
  const session = await client.createSession('agi-0');

  try {
    // Navigate to a specific URL
    const navResult = await session.navigate('https://amazon.com');
    console.log('Navigated to:', navResult.currentUrl);

    // Take a screenshot
    const screenshot = await session.screenshot();
    console.log('Screenshot captured:');
    console.log('  URL:', screenshot.url);
    console.log('  Title:', screenshot.title);
    console.log('  Image data length:', screenshot.screenshot.length, 'characters');

    // The screenshot.screenshot contains base64-encoded JPEG data
    // You can save it to a file or display it
  } finally {
    await session.delete();
  }
}

main().catch(console.error);
