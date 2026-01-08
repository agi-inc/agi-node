/**
 * Batch Task Processor - Production Pattern Example
 *
 * Description:
 *   Process large batches of tasks in parallel with AGI for maximum throughput.
 *   Uses Promise.all for concurrent session management.
 *   Includes progress tracking, error handling, and result aggregation.
 *
 * Business Value:
 *   - Process hundreds/thousands of items efficiently
 *   - Maximize API usage and throughput
 *   - Robust error handling and retry logic
 *
 * Requirements:
 *   - AGI_API_KEY environment variable
 *
 * Usage:
 *   npx tsx examples/production/batch-processor.ts
 *
 * Production Notes:
 *   - Adjust worker count based on rate limits
 *   - Add exponential backoff for retries
 *   - Use queue system for very large batches
 *   - Monitor and log all operations
 */

import { writeFile } from 'fs/promises';
import { AGIClient, AgentExecutionError } from '../../src';

interface BatchItem {
  id: string;
  [key: string]: any;
}

interface BatchResult {
  item: BatchItem;
  result: any;
  status: 'success' | 'error';
  timestamp: string;
  error?: string;
}

interface BatchSummary {
  metadata: {
    total_items: number;
    successful: number;
    failed: number;
    success_rate: number;
    processing_time_seconds: number;
    agent: string;
    max_workers: number;
  };
  results: BatchResult[];
  errors: BatchResult[];
}

/**
 * Process large batches of tasks with AGI in parallel.
 */
export class BatchProcessor {
  private client: AGIClient;
  private maxWorkers: number;
  private agent: string;
  private results: BatchResult[] = [];
  private errors: BatchResult[] = [];
  private startTime?: number;

  /**
   * Initialize batch processor.
   *
   * @param maxWorkers - Number of parallel sessions (default: 5)
   * @param agent - AGI agent to use for all tasks
   */
  constructor(maxWorkers: number = 5, agent: string = 'agi-0-fast') {
    this.client = new AGIClient({
      apiKey: process.env.AGI_API_KEY || 'your-api-key-here',
    });
    this.maxWorkers = maxWorkers;
    this.agent = agent;
  }

  /**
   * Process batch of tasks in parallel.
   *
   * @param items - List of items to process
   * @param taskGenerator - Function that generates task string from item
   * @returns List of successful results
   */
  async processBatch(
    items: BatchItem[],
    taskGenerator: (item: BatchItem) => string
  ): Promise<BatchResult[]> {
    const total = items.length;
    console.log('\nBatch Processing');
    console.log(`   Items: ${total}`);
    console.log(`   Workers: ${this.maxWorkers}`);
    console.log(`   Agent: ${this.agent}`);
    console.log('='.repeat(60));

    this.startTime = Date.now();
    let completed = 0;

    // Process in chunks to limit concurrency
    for (let i = 0; i < items.length; i += this.maxWorkers) {
      const chunk = items.slice(i, i + this.maxWorkers);

      const promises = chunk.map(async (item) => {
        try {
          const result = await this.processSingle(item, taskGenerator(item));
          const batchResult: BatchResult = {
            item,
            result,
            status: 'success',
            timestamp: new Date().toISOString(),
          };
          this.results.push(batchResult);

          completed++;
          const elapsed = (Date.now() - this.startTime!) / 1000;
          const rate = completed / elapsed;
          const eta = (total - completed) / rate;

          console.log(
            `✓ [${completed}/${total}] ${item.id} ` +
              `(Rate: ${rate.toFixed(1)}/s, ETA: ${eta.toFixed(0)}s)`
          );

          return batchResult;
        } catch (error) {
          const batchResult: BatchResult = {
            item,
            result: null,
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
          };
          this.errors.push(batchResult);

          completed++;
          console.log(`✗ [${completed}/${total}] ${item.id} - Error: ${error}`);

          return batchResult;
        }
      });

      await Promise.all(promises);
    }

    // Summary
    const elapsedTotal = (Date.now() - this.startTime!) / 1000;
    const successRate = total > 0 ? (this.results.length / total) * 100 : 0;

    console.log('\n' + '='.repeat(60));
    console.log(`Batch Complete in ${elapsedTotal.toFixed(1)}s`);
    console.log(`   Success: ${this.results.length}/${total} (${successRate.toFixed(1)}%)`);
    console.log(`   Errors: ${this.errors.length}`);
    console.log(`   Avg Rate: ${(total / elapsedTotal).toFixed(2)} items/second`);

    return this.results;
  }

  /**
   * Process a single task.
   */
  private async processSingle(item: BatchItem, task: string): Promise<any> {
    try {
      await using session = this.client.session(this.agent);
      const taskResult = await session.runTask(task);
      return taskResult.data;
    } catch (error) {
      if (error instanceof AgentExecutionError) {
        throw new Error(`Task execution failed: ${error.message}`);
      }
      throw new Error(`Unexpected error: ${error}`);
    }
  }

  /**
   * Save results and errors to JSON file.
   */
  async saveResults(filename?: string): Promise<string> {
    if (!filename) {
      filename = `batch_results_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    }

    const output: BatchSummary = {
      metadata: {
        total_items: this.results.length + this.errors.length,
        successful: this.results.length,
        failed: this.errors.length,
        success_rate:
          this.results.length + this.errors.length > 0
            ? (this.results.length / (this.results.length + this.errors.length)) * 100
            : 0,
        processing_time_seconds: this.startTime ? (Date.now() - this.startTime) / 1000 : 0,
        agent: this.agent,
        max_workers: this.maxWorkers,
      },
      results: this.results,
      errors: this.errors,
    };

    await writeFile(filename, JSON.stringify(output, null, 2));
    console.log(`\nResults saved to: ${filename}`);
    return filename;
  }
}

// Example use cases

/**
 * Example: Extract contact info from multiple websites in parallel.
 */
async function extractContactInfoBatch(
  urls: string[],
  workers: number = 10
): Promise<BatchResult[]> {
  // Convert URLs to items
  const items: BatchItem[] = urls.map((url, i) => ({
    id: `site_${i + 1}`,
    url,
  }));

  // Define task generator
  const generateTask = (item: BatchItem): string => {
    return (
      `Go to ${item.url} and extract contact information:\n` +
      `- company_name\n` +
      `- email addresses (support, sales, info)\n` +
      `- phone numbers\n` +
      `- address\n` +
      `- social media links\n` +
      `Return as JSON.`
    );
  };

  // Process batch
  const processor = new BatchProcessor(workers, 'agi-0-fast');
  const results = await processor.processBatch(items, generateTask);
  await processor.saveResults('contact_info_results.json');

  return results;
}

/**
 * Example: Check product availability across multiple retailers.
 */
async function verifyProductAvailabilityBatch(
  products: Array<{ name: string; retailers: string[] }>,
  workers: number = 5
): Promise<BatchResult[]> {
  const items: BatchItem[] = [];
  for (const product of products) {
    for (const retailer of product.retailers || []) {
      items.push({
        id: `${product.name}_${retailer}`,
        product: product.name,
        retailer,
      });
    }
  }

  const generateTask = (item: BatchItem): string => {
    return (
      `Go to ${item.retailer} and search for '${item.product}'.\n` +
      `Check if it's in stock and return:\n` +
      `- in_stock: boolean\n` +
      `- price: current price\n` +
      `- shipping: shipping info\n` +
      `- delivery_estimate: estimated delivery\n` +
      `Return as JSON.`
    );
  };

  const processor = new BatchProcessor(workers, 'agi-0-fast');
  const results = await processor.processBatch(items, generateTask);
  await processor.saveResults('availability_results.json');

  return results;
}

// Demo
async function main() {
  console.log('AGI Batch Processor Demo');
  console.log('='.repeat(60));

  // Example: Extract contact info from 3 websites
  const demoUrls = ['https://anthropic.com', 'https://openai.com', 'https://google.com'];

  console.log('\nDemo: Extracting contact info from 3 websites...');
  await extractContactInfoBatch(demoUrls, 3);

  console.log('\n✓ Demo complete!');
  console.log('\nFor production use:');
  console.log('  - Adjust maxWorkers based on your rate limits');
  console.log('  - Add retry logic for failed tasks');
  console.log('  - Use queue systems for very large batches');
}

// Run demo if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { extractContactInfoBatch, verifyProductAvailabilityBatch };
