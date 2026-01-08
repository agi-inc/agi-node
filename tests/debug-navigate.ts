/**
 * Debug navigate response structure
 */

const API_KEY = 'f94a74fa-bcdf-429f-97b0-37b7a1df6ab2';

async function testNavigate() {
  // Create session
  const createResponse = await fetch('https://api.agi.tech/v1/sessions', {
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

  const session = await createResponse.json();
  console.log('Session created:', session.session_id);

  // Navigate
  const navResponse = await fetch(
    `https://api.agi.tech/v1/sessions/${session.session_id}/navigate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        url: 'https://example.com',
      }),
    }
  );

  const navData = await navResponse.json();

  console.log('\n=== NAVIGATE RESPONSE ===');
  console.log(JSON.stringify(navData, null, 2));
  console.log('\nKeys:', Object.keys(navData));

  // Cleanup
  await fetch(`https://api.agi.tech/v1/sessions/${session.session_id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });
  console.log('\nSession deleted');
}

testNavigate().catch(console.error);
