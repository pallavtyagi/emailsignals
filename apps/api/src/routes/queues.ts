/**
 * Queue Status Routes
 *
 * Provides monitoring endpoints for BullMQ queues.
 * Admin-only access.
 */

import type { FastifyInstance } from 'fastify';
import { requireRole } from '../middleware/auth.js';
import { getQueueStatus } from '../queues/index.js';

export async function queueRoutes(app: FastifyInstance) {
  // GET /v1/queues/status — Queue dashboard data
  app.get(
    '/status',
    { preHandler: [requireRole('admin')] },
    async () => {
      const status = await getQueueStatus();

      return {
        queues: Object.entries(status).map(([name, counts]) => ({
          name,
          ...counts,
        })),
        timestamp: new Date().toISOString(),
      };
    },
  );
}
