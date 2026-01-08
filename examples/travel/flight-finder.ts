/**
 * Flight Finder - Simplified Example
 *
 * Description:
 *   Find and compare flight options with a single natural language task.
 *   The AGI agent handles searching flights, comparing prices, and filtering options.
 *
 * Usage:
 *   npx tsx examples/travel/flight-finder.ts
 *
 * Example:
 *   Modify the flight parameters below, then run:
 *   AGI_API_KEY=your_key npx tsx examples/travel/flight-finder.ts
 */

import { AGIClient } from '../../src';

// Configure your flight search
const origin = 'SFO';
const destination = 'JFK';
const date = '2026-02-02';
const maxPrice = 450;
const nonstop = true;

const client = new AGIClient({
  apiKey: process.env.AGI_API_KEY || 'your-api-key-here',
});

async function main() {
  console.log(`Finding flights: ${origin} → ${destination}`);
  console.log(`Date: ${date}`);
  console.log(`Max price: $${maxPrice}`);
  console.log(`Nonstop only: ${nonstop}`);
  console.log('='.repeat(60));

  await using session = client.session('agi-0');

  const nonstopPreference = nonstop ? 'nonstop flights only' : 'any flights (stops OK)';

  const result = await session.runTask(
    `Find ${nonstopPreference} from ${origin} to ${destination} on ${date}. ` +
      `Show me the 3 best options under $${maxPrice}. ` +
      `Include airline, price, departure/arrival times, and booking link for each option.`
  );

  console.log(`\nResult:\n${JSON.stringify(result.data, null, 2)}`);
  console.log(`\nDuration: ${result.metadata.duration.toFixed(2)}s`);
  console.log(`Steps: ${result.metadata.steps}`);
}

main().catch(console.error);
