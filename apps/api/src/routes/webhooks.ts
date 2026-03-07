import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import { requireRole } from '../middleware/auth.js';
import * as eventService from '../services/event.service.js';
import crypto from 'crypto';
import { MAX_WEBHOOKS_PER_WORKSPACE } from '@signalwave/shared';

export async function webhookRoutes(app: FastifyInstance) {
  // POST /v1/webhooks/ses — SES event webhook (SNS subscription)
  // This endpoint is NOT behind auth middleware (SNS sends requests directly)
  app.post('/ses', async (request, reply) => {
    const body = request.body as Record<string, unknown>;

    try {
      const result = await eventService.processSesEvent(body as {
        Type: string;
        MessageId?: string;
        SubscribeURL?: string;
        Message?: string;
        TopicArn?: string;
      });

      if (result.processed) {
        app.log.info(
          { eventType: result.eventType, recipients: result.recipients },
          'Processed SES event',
        );
      }

      return reply.status(200).send({ received: true, processed: result.processed });
    } catch (err) {
      app.log.error({ err }, 'Failed to process SES event');
      return reply.status(200).send({ received: true, processed: false });
    }
  });

  // GET /v1/webhooks — List webhook endpoints
  app.get('/', async (request) => {
    const { workspaceId } = request.auth;

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { workspaceId },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: endpoints };
  });

  // POST /v1/webhooks — Create webhook endpoint
  app.post(
    '/',
    { preHandler: [requireRole('admin')] },
    async (request, reply) => {
      const { workspaceId } = request.auth;
      const { url, events } = request.body as { url: string; events?: string[] };

      if (!url) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'url is required' },
        });
      }

      // Check webhook limit
      const existingCount = await prisma.webhookEndpoint.count({
        where: { workspaceId },
      });

      if (existingCount >= MAX_WEBHOOKS_PER_WORKSPACE) {
        return reply.status(422).send({
          error: {
            code: 'LIMIT_REACHED',
            message: `Maximum ${MAX_WEBHOOKS_PER_WORKSPACE} webhook endpoints per workspace`,
          },
        });
      }

      // Generate webhook secret
      const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

      const endpoint = await prisma.webhookEndpoint.create({
        data: {
          workspaceId,
          url,
          events: events || [],
          secret,
        },
      });

      return reply.status(201).send(endpoint);
    },
  );

  // PATCH /v1/webhooks/:id — Update webhook endpoint
  app.patch(
    '/:id',
    { preHandler: [requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { workspaceId } = request.auth;
      const { url, events, active } = request.body as {
        url?: string;
        events?: string[];
        active?: boolean;
      };

      const existing = await prisma.webhookEndpoint.findFirst({
        where: { id, workspaceId },
      });

      if (!existing) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
      }

      const updated = await prisma.webhookEndpoint.update({
        where: { id },
        data: {
          ...(url !== undefined ? { url } : {}),
          ...(events !== undefined ? { events } : {}),
          ...(active !== undefined ? { active } : {}),
        },
      });

      return updated;
    },
  );

  // DELETE /v1/webhooks/:id
  app.delete(
    '/:id',
    { preHandler: [requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { workspaceId } = request.auth;

      const existing = await prisma.webhookEndpoint.findFirst({
        where: { id, workspaceId },
      });

      if (!existing) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
      }

      await prisma.webhookEndpoint.delete({ where: { id } });
      return reply.status(204).send();
    },
  );
}
