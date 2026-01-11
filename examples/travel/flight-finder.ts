/**
 * Flight Finder - Multi-Criteria Flight Search
 *
 * Find and compare flight options across multiple booking sites.
 * Save time and money by automating flight research.
 *
 * Business Value:
 *   - Save 20-40 minutes per flight search
 *   - Compare prices across all major booking sites
 *   - Find optimal routes automatically
 *   - Track price changes over time
 *
 * Complexity: ⭐⭐ Intermediate
 *
 * Requirements:
 *   npm install commander
 *
 * Usage:
 *   # Find nonstop flights SFO → JFK
 *   AGI_API_KEY=your_key npx tsx examples/travel/flight-finder.ts \
 *     --from SFO \
 *     --to JFK \
 *     --date "2026-02-15" \
 *     --max-price 450 \
 *     --nonstop
 *
 *   # Find flights with layovers allowed
 *   AGI_API_KEY=your_key npx tsx examples/travel/flight-finder.ts \
 *     --from LAX \
 *     --to BOS \
 *     --date "2026-03-01" \
 *     --max-price 300
 *
 *   # Find cheapest flights (no price limit)
 *   AGI_API_KEY=your_key npx tsx examples/travel/flight-finder.ts \
 *     --from ORD \
 *     --to MIA \
 *     --date "2026-04-10" \
 *     --count 5
 *
 * Output:
 *   - Console: Formatted flight options
 *   - Shows: Airline, price, times, duration, stops
 *   - Provides: Direct booking links
 *
 * Production Notes:
 *   - Schedule regular searches for price tracking
 *   - Set up price drop alerts
 *   - Compare with return flights
 *   - Add calendar view for flexible dates
 */

import { Command } from 'commander';
import { AGIClient, AgentExecutionError } from '../../src';

interface FlightOption {
  airline: string;
  price: number;
  departure_time: string;
  arrival_time: string;
  duration?: string;
  stops: number;
  booking_link: string;
}

const client = new AGIClient({
  apiKey: process.env.AGI_API_KEY || 'your-api-key-here',
});

async function findFlights(
  origin: string,
  destination: string,
  date: string,
  maxPrice: number | undefined,
  nonstopOnly: boolean,
  count: number
): Promise<FlightOption[]> {
  console.log('AGI Flight Finder');
  console.log('='.repeat(60));
  console.log(`Route: ${origin} → ${destination}`);
  console.log(`Date: ${date}`);
  if (maxPrice) {
    console.log(`Max Price: $${maxPrice}`);
  }
  console.log(`Stops: ${nonstopOnly ? 'Nonstop only' : 'Any'}`);
  console.log(`Results: Top ${count}`);
  console.log('='.repeat(60));
  console.log('\nSearching flights...\n');

  try {
    await using session = client.session('agi-0');

    let task = `Search for flights from ${origin} to ${destination} on ${date}. `;

    if (nonstopOnly) {
      task += `Only show nonstop flights. `;
    }

    if (maxPrice) {
      task += `Filter to options under $${maxPrice}. `;
    }

    task +=
      `Show me the ${count} best options sorted by value (price and duration). ` +
      `For each option, provide: ` +
      `1. Airline name ` +
      `2. Price ` +
      `3. Departure time ` +
      `4. Arrival time ` +
      `5. Flight duration ` +
      `6. Number of stops ` +
      `7. Booking link ` +
      `Return as JSON array with fields: airline, price, departure_time, arrival_time, duration, stops, booking_link.`;

    const result = await session.runTask(task, {
      timeout: 600000, // 10 minutes for comprehensive search
    });

    return (result.data as FlightOption[]) || [];
  } catch (error) {
    if (error instanceof AgentExecutionError) {
      throw new Error(`Flight search failed: ${error.message}`);
    }
    throw error;
  }
}

function displayResults(flights: FlightOption[], maxPrice?: number) {
  console.log('\nFlight Options:');
  console.log('='.repeat(60));

  if (flights.length === 0) {
    console.log('No flights found. Try:');
    console.log('  - Increasing max price');
    console.log('  - Allowing layovers (remove --nonstop)');
    console.log('  - Checking different dates');
    console.log('  - Verifying airport codes');
    return;
  }

  // Filter by max price if specified
  const filtered = maxPrice ? flights.filter((f) => f.price <= maxPrice) : flights;

  if (maxPrice && filtered.length === 0) {
    console.log(`No options found under $${maxPrice}`);
    console.log('\nAll results:');
  }

  const toDisplay = filtered.length > 0 ? filtered : flights;

  toDisplay.forEach((flight, index) => {
    const bestValue = index === 0 ? ' ⭐ BEST VALUE' : '';
    console.log(`\n${index + 1}. ${flight.airline}${bestValue}`);
    console.log(`   Price: $${flight.price.toFixed(2)}`);
    console.log(`   Departure: ${flight.departure_time}`);
    console.log(`   Arrival: ${flight.arrival_time}`);

    if (flight.duration) {
      console.log(`   Duration: ${flight.duration}`);
    }

    const stopsText =
      flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`;
    console.log(`   Stops: ${stopsText}`);
    console.log(`   Book: ${flight.booking_link}`);
  });

  if (filtered.length >= 2) {
    const cheapest = filtered[0];
    const savings = filtered[filtered.length - 1].price - cheapest.price;
    console.log('\n' + '='.repeat(60));
    console.log(`💰 Best Deal: ${cheapest.airline} at $${cheapest.price.toFixed(2)}`);
    if (savings > 0) {
      console.log(`   Saves $${savings.toFixed(2)} vs most expensive option`);
    }
  }
}

async function main() {
  const program = new Command()
    .name('flight-finder')
    .description('Find and compare flight options across booking sites')
    .requiredOption('-f, --from <code>', 'Origin airport code (e.g., SFO, LAX)')
    .requiredOption('-t, --to <code>', 'Destination airport code (e.g., JFK, BOS)')
    .requiredOption('-d, --date <date>', 'Departure date (YYYY-MM-DD)')
    .option('-m, --max-price <number>', 'Maximum price', parseFloat)
    .option('-n, --nonstop', 'Only show nonstop flights', false)
    .option('-c, --count <number>', 'Number of options to show', '3')
    .parse();

  const options = program.opts();
  const count = parseInt(options.count, 10);

  // Validation
  if (options.from.length !== 3 || options.to.length !== 3) {
    console.error('Error: Airport codes must be 3 letters (e.g., SFO, JFK)');
    process.exit(1);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    console.error('Error: Date must be in YYYY-MM-DD format');
    process.exit(1);
  }

  if (options.maxPrice && (isNaN(options.maxPrice) || options.maxPrice <= 0)) {
    console.error('Error: Max price must be a positive number');
    process.exit(1);
  }

  if (isNaN(count) || count < 1 || count > 10) {
    console.error('Error: Count must be between 1 and 10');
    process.exit(1);
  }

  try {
    const flights = await findFlights(
      options.from.toUpperCase(),
      options.to.toUpperCase(),
      options.date,
      options.maxPrice,
      options.nonstop,
      count
    );

    displayResults(flights, options.maxPrice);

    console.log('\n' + '='.repeat(60));
    console.log('Next Steps:');
    console.log('  1. Click booking link to purchase');
    console.log('  2. Compare with return flight prices');
    console.log('  3. Set up price alerts for this route');
    console.log('  4. Check flexible date options');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    console.error('\nTroubleshooting:');
    console.error('  - Verify airport codes are correct');
    console.error('  - Check date is in the future');
    console.error('  - Try increasing max price');
    console.error('  - Allow layovers (remove --nonstop)');
    process.exit(1);
  }
}

main();
