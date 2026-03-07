import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import Redis from 'ioredis';
import { registerRoutes } from './routes/index.js';
import { prisma } from './db/client.js';
import authPlugin from './middleware/auth.js';
import { AppError } from './lib/errors.js';
import { startAllWorkers, stopAllWorkers } from './workers/index.js';
import { closeAllQueues, getQueueStatus } from './queues/index.js';
import startupValidation from './plugins/startup-validation.js';
import requestContext from './plugins/request-context.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // ── Startup Validation ────────────────────────────────────

  await app.register(startupValidation);

  // ── Request Context ──────────────────────────────────────

  await app.register(requestContext);

  // ── Security ───────────────────────────────────────────────

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  // ── CORS ───────────────────────────────────────────────────

  await app.register(cors, {
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  });

  // ── Rate Limiting ──────────────────────────────────────────

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // ── Multipart (file uploads) ───────────────────────────────

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  });

  // ── Raw Body Support (for Stripe webhook verification) ─────

  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      try {
        // Store raw body for webhook signature verification
        (req as unknown as { rawBody: Buffer }).rawBody = body as Buffer;
        const json = JSON.parse((body as Buffer).toString());
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // ── Auth Middleware ─────────────────────────────────────────

  await app.register(authPlugin);

  // ── Error Handler ──────────────────────────────────────────

  app.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.validation,
        },
      });
    }

    // Log unexpected errors
    request.log.error({ err: error }, 'Unhandled error');

    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: {
        code: 'INTERNAL_ERROR',
        message:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : error.message,
      },
    });
  });

  // ── Health Check ───────────────────────────────────────────

  app.get('/health', async () => {
    const checks: Record<string, unknown> = {};
    let status: 'ok' | 'degraded' = 'ok';

    // Database check
    try {
      const dbStart = performance.now();
      await prisma.$queryRawUnsafe('SELECT 1');
      checks.database = { status: 'ok', latency: Math.round(performance.now() - dbStart) };
    } catch {
      checks.database = { status: 'error' };
      status = 'degraded';
    }

    // Redis check
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const redis = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 3000 });
      const redisStart = performance.now();
      await redis.ping();
      checks.redis = { status: 'ok', latency: Math.round(performance.now() - redisStart) };
      await redis.quit();
    } catch {
      checks.redis = { status: 'error' };
      status = 'degraded';
    }

    // Memory
    const mem = process.memoryUsage();
    checks.memory = { rss: mem.rss, heapUsed: mem.heapUsed };

    return {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      uptime: Math.round(process.uptime()),
      checks,
    };
  });

  // ── Queue Health ─────────────────────────────────────────

  app.get('/health/queues', async () => {
    try {
      const queues = await getQueueStatus();
      return { status: 'ok', queues };
    } catch {
      return { status: 'error', message: 'Failed to fetch queue status' };
    }
  });

  // ── Register API Routes ────────────────────────────────────

  await registerRoutes(app);

  // ── Start Background Workers ───────────────────────────────

  const enableWorkers = process.env.ENABLE_WORKERS !== 'false';
  if (enableWorkers) {
    try {
      startAllWorkers();
      app.log.info('Background workers started');
    } catch (err) {
      app.log.warn({ err }, 'Failed to start background workers (Redis may be unavailable)');
    }
  }

  // ── Graceful Shutdown ──────────────────────────────────────

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down...`);

      // Stop accepting new requests
      await app.close();

      // Stop workers
      if (enableWorkers) {
        try {
          await stopAllWorkers();
        } catch (err) {
          app.log.error({ err }, 'Error stopping workers');
        }
      }

      // Close queues
      try {
        await closeAllQueues();
      } catch (err) {
        app.log.error({ err }, 'Error closing queues');
      }

      // Disconnect from database
      await prisma.$disconnect();

      process.exit(0);
    });
  }

  // ── Start Server ───────────────────────────────────────────

  await app.listen({ port: PORT, host: HOST });
  app.log.info(`SignalWave API running on http://${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
