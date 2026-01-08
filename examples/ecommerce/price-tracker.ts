/**
 * Multi-Site Price Tracker - Simplified Example
 *
 * Description:
 *   Track product prices across multiple retailers with a single natural language task.
 *   The AGI agent handles navigating sites, comparing prices, and finding the best deal.
 *
 * Usage:
 *   npx tsx examples/ecommerce/price-tracker.ts
 *
 * Example:
 *   Modify the product and maxPrice variables below, then run:
 *   AGI_API_KEY=your_key npx tsx examples/ecommerce/price-tracker.ts
 */

import { AGIClient } from '../../src';

// Configure your search
const product = 'Sony WH-1000XM5 headphones';
const maxPrice = 350;

const client = new AGIClient({
  apiKey: process.env.AGI_API_KEY || 'your-api-key-here',
});

async function main() {
  console.log(`Searching for: ${product}`);
  console.log(`Max price: $${maxPrice}`);
  console.log('='.repeat(60));

  await using session = client.session('agi-0');

  const result = await session.runTask(
    `Find ${product} on Amazon, eBay, and Walmart. ` +
      `Compare the prices and show me which site has the best deal under $${maxPrice}. ` +
      `Include the price, availability, and product link for each site.`
  );

  console.log(`\nResult:\n${JSON.stringify(result.data, null, 2)}`);
  console.log(`\nDuration: ${result.metadata.duration.toFixed(2)}s`);
  console.log(`Steps: ${result.metadata.steps}`);
}

main().catch(console.error);
