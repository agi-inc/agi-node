/**
 * Test raw API response directly with fetch
 */

const API_KEY = 'f94a74fa-bcdf-429f-97b0-37b7a1df6ab2';

async function testRawAPI() {
  const response = await fetch('https://api.agi.tech/v1/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      agent_name: 'agi-0',
      max_steps: 100,
    }),
  });

  const data = await response.json();

  console.log('=== RAW API RESPONSE ===');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n=== FIELD NAMES ===');
  console.log('Keys:', Object.keys(data));

  // Cleanup
  if (data.session_id) {
    await fetch(`https://api.agi.tech/v1/sessions/${data.session_id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });
    console.log('\nSession deleted');
  }
}

testRawAPI().catch(console.error);
