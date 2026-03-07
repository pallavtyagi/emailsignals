import type { FastifyInstance } from 'fastify';
import { createDomainSchema } from '@signalwave/shared';
import { requireRole } from '../middleware/auth.js';
import * as domainService from '../services/domain.service.js';
import { domainVerificationQueue } from '../queues/index.js';

export async function domainRoutes(app: FastifyInstance) {
  // GET /v1/domains
  app.get('/', async (request) => {
    const { workspaceId } = request.auth;

    const domains = await (await import('../db/client.js')).prisma.domain.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    return { data: domains };
  });

  // POST /v1/domains
  app.post(
    '/',
    { preHandler: [requireRole('admin')] },
    async (request, reply) => {
      const { workspaceId } = request.auth;

      const parsed = createDomainSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(422).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }

      const result = await domainService.createDomain({
        workspaceId,
        domain: parsed.data.domain,
      });

      // Enqueue domain verification polling
      await domainVerificationQueue.add(
        'verify',
        { domainId: result.id, workspaceId },
        { delay: 30_000, jobId: `domain-verify-${result.id}-1` },
      );

      return reply.status(201).send(result);
    },
  );

  // POST /v1/domains/:id/verify
  app.post('/:id/verify', async (request) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;

    const result = await domainService.verifyDomain(id, workspaceId);
    return result;
  });

  // GET /v1/domains/:id/health
  app.get('/:id/health', async (request) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;

    const health = await domainService.checkDomainHealth(id, workspaceId);
    return health;
  });

  // DELETE /v1/domains/:id
  app.delete(
    '/:id',
    { preHandler: [requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { workspaceId } = request.auth;

      await domainService.deleteDomain(id, workspaceId);
      return reply.status(204).send();
    },
  );
}
