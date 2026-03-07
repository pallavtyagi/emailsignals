import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { registerRoutes } from './routes/index.js';
import { prisma } from './db/client.js';
import authPlugin from './middleware/auth.js';
import { AppError } from './lib/errors.js';
import { startAllWorkers, stopAllWorkers } from './workers/index.js';
import { closeAllQueues } from './queues/index.js';

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

  // ── Security ───────────────────────────────────────────────

  await app.register(helmet, {
    contentSecurityPolicy: false, // Handled by frontend
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

  app.setErrorHandler((error, request, reply) => {
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

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  }));

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
