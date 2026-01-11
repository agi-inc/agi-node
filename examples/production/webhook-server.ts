/**
 * Webhook Server - Async Workflow Pattern
 *
 * Handle long-running AGI tasks asynchronously with webhooks.
 * Essential for production applications that need to process tasks in the background.
 *
 * Business Value:
 *   - Handle long-running tasks without blocking
 *   - Scale to thousands of concurrent tasks
 *   - Integrate with queues (Bull, RabbitMQ)
 *   - Build event-driven architectures
 *
 * Requirements:
 *   npm install express @types/express
 *   npm install commander  # for CLI
 *
 * Usage:
 *   # Start the webhook server
 *   AGI_API_KEY=your_key npx tsx examples/production/webhook-server.ts --port 3000
 *
 *   # In another terminal, test it
 *   curl -X POST http://localhost:3000/webhook \
 *     -H "Content-Type: application/json" \
 *     -d '{"session_id":"test123","status":"finished","result":"Task completed"}'
 *
 * Production Notes:
 *   - Deploy behind reverse proxy (nginx, Cloudflare)
 *   - Implement signature verification for security
 *   - Add request logging and monitoring
 *   - Use environment variables for configuration
 *   - Implement retry logic for failed webhooks
 *   - Store webhook events in database for audit trail
 */

import express, { Request, Response } from 'express';
import { Command } from 'commander';
import { AGIClient } from '../../src';

interface WebhookPayload {
  session_id: string;
  status: 'running' | 'finished' | 'failed';
  event?: string;
  data?: unknown;
  result?: unknown;
  error?: string;
  timestamp?: string;
}

interface TaskRecord {
  sessionId: string;
  status: 'pending' | 'running' | 'finished' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  result?: unknown;
  error?: string;
  events: Array<{
    timestamp: Date;
    event: string;
    data: unknown;
  }>;
}

/**
 * In-memory task store (use Redis or database in production)
 */
const taskStore = new Map<string, TaskRecord>();

/**
 * Webhook Server
 */
class WebhookServer {
  private app: express.Application;
  private port: number;
  private client: AGIClient;

  constructor(port: number) {
    this.port = port;
    this.app = express();
    this.app.use(express.json());

    this.client = new AGIClient({
      apiKey: process.env.AGI_API_KEY || 'your-api-key-here',
    });

    this.setupRoutes();
  }

  /**
   * Setup Express routes
   */
  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Webhook endpoint - receives notifications from AGI
    this.app.post('/webhook', this.handleWebhook.bind(this));

    // Start a new task
    this.app.post('/tasks', this.createTask.bind(this));

    // Get task status
    this.app.get('/tasks/:sessionId', this.getTask.bind(this));

    // List all tasks
    this.app.get('/tasks', this.listTasks.bind(this));
  }

  /**
   * Handle incoming webhook from AGI
   */
  private async handleWebhook(req: Request, res: Response) {
    const payload: WebhookPayload = req.body;

    console.log('\n📥 Webhook received:');
    console.log(`   Session ID: ${payload.session_id}`);
    console.log(`   Status: ${payload.status}`);
    console.log(`   Event: ${payload.event || 'N/A'}`);

    // Verify webhook signature (implement in production)
    // if (!this.verifySignature(req)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    // Get or create task record
    let task = taskStore.get(payload.session_id);
    if (!task) {
      task = {
        sessionId: payload.session_id,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
      };
      taskStore.set(payload.session_id, task);
    }

    // Update task record
    task.updatedAt = new Date();
    task.status = payload.status;

    // Log event
    task.events.push({
      timestamp: new Date(),
      event: payload.event || payload.status,
      data: payload.data || payload.result || payload.error,
    });

    // Handle different statuses
    switch (payload.status) {
      case 'finished':
        task.result = payload.result || payload.data;
        console.log('   ✓ Task completed successfully');
        await this.onTaskCompleted(payload.session_id, task.result);
        break;

      case 'failed':
        task.error = payload.error || 'Unknown error';
        console.error('   ✗ Task failed:', task.error);
        await this.onTaskFailed(payload.session_id, task.error);
        break;

      case 'running':
        console.log('   ⏳ Task in progress');
        break;
    }

    // Acknowledge webhook
    res.json({ status: 'received', session_id: payload.session_id });
  }

  /**
   * Create a new task with webhook callback
   */
  private async createTask(req: Request, res: Response) {
    const { task, agent = 'agi-0' } = req.body;

    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }

    try {
      // Create session with webhook URL
      const webhookUrl = `http://localhost:${this.port}/webhook`;

      const session = await this.client.sessions.create(agent, {
        goal: task,
        webhookUrl, // AGI will POST updates to this URL
      });

      // Store task record
      const taskRecord: TaskRecord = {
        sessionId: session.sessionId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
      };
      taskStore.set(session.sessionId, taskRecord);

      console.log(`\n✓ Task created: ${session.sessionId}`);
      console.log(`  Webhook URL: ${webhookUrl}`);

      res.json({
        session_id: session.sessionId,
        status: 'created',
        webhook_url: webhookUrl,
      });
    } catch (error) {
      console.error('Failed to create task:', error);
      res.status(500).json({
        error: 'Failed to create task',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get task status
   */
  private getTask(req: Request, res: Response) {
    const { sessionId } = req.params;
    const task = taskStore.get(sessionId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  }

  /**
   * List all tasks
   */
  private listTasks(req: Request, res: Response) {
    const tasks = Array.from(taskStore.values());
    res.json({
      total: tasks.length,
      tasks: tasks.map((t) => ({
        sessionId: t.sessionId,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  }

  /**
   * Handle task completion (implement your business logic here)
   */
  private async onTaskCompleted(sessionId: string, result: unknown) {
    // Example: Send notification, update database, trigger next step
    console.log(`   Processing completed task: ${sessionId}`);

    // Your business logic here
    // - Send email notification
    // - Update database
    // - Trigger next workflow step
    // - etc.
  }

  /**
   * Handle task failure (implement your business logic here)
   */
  private async onTaskFailed(sessionId: string, error: string) {
    // Example: Retry, alert team, log to monitoring
    console.log(`   Processing failed task: ${sessionId}`);

    // Your business logic here
    // - Retry with exponential backoff
    // - Alert on-call engineer
    // - Log to error tracking (Sentry, etc.)
    // - etc.
  }

  /**
   * Verify webhook signature (implement for production)
   */
  private verifySignature(req: Request): boolean {
    // In production, verify HMAC signature
    // const signature = req.headers['x-agi-signature'];
    // const payload = JSON.stringify(req.body);
    // const expectedSignature = crypto
    //   .createHmac('sha256', WEBHOOK_SECRET)
    //   .update(payload)
    //   .digest('hex');
    // return signature === expectedSignature;

    return true; // Skip verification in example
  }

  /**
   * Start the server
   */
  start() {
    this.app.listen(this.port, () => {
      console.log('AGI Webhook Server');
      console.log('='.repeat(60));
      console.log(`Server running on http://localhost:${this.port}`);
      console.log('='.repeat(60));
      console.log('\nEndpoints:');
      console.log(`  GET  /health              - Health check`);
      console.log(`  POST /webhook             - Webhook endpoint (for AGI)`);
      console.log(`  POST /tasks               - Create new task`);
      console.log(`  GET  /tasks/:sessionId    - Get task status`);
      console.log(`  GET  /tasks               - List all tasks`);
      console.log('\nTest the webhook:');
      console.log(`  curl -X POST http://localhost:${this.port}/webhook \\`);
      console.log(`    -H "Content-Type: application/json" \\`);
      console.log(`    -d '{"session_id":"test","status":"finished","result":"Done"}'`);
      console.log('\nCreate a task:');
      console.log(`  curl -X POST http://localhost:${this.port}/tasks \\`);
      console.log(`    -H "Content-Type: application/json" \\`);
      console.log(`    -d '{"task":"Search Google for AI news"}'`);
      console.log('\nPress Ctrl+C to stop\n');
    });
  }
}

/**
 * CLI
 */
async function main() {
  const program = new Command()
    .name('webhook-server')
    .description('AGI Webhook Server for async task processing')
    .option('-p, --port <number>', 'Port to listen on', '3000')
    .parse();

  const options = program.opts();
  const port = parseInt(options.port, 10);

  if (isNaN(port) || port < 1 || port > 65535) {
    console.error('Error: Invalid port number');
    process.exit(1);
  }

  const server = new WebhookServer(port);
  server.start();
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { WebhookServer };
