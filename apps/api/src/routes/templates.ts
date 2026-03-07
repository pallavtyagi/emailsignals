import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateQuerySchema,
} from '@signalwave/shared';
import { requireRole } from '../middleware/auth.js';

export async function templateRoutes(app: FastifyInstance) {
  // GET /v1/templates
  app.get('/', async (request) => {
    const { workspaceId } = request.auth;
    const query = templateQuerySchema.parse(request.query);

    const where: Record<string, unknown> = { workspaceId };
    if (query.category) where.category = query.category;
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const templates = await prisma.template.findMany({
      where: where as Parameters<typeof prisma.template.findMany>[0]['where'],
      select: {
        id: true,
        name: true,
        category: true,
        subject: true,
        previewText: true,
        thumbnailUrl: true,
        isStarter: true,
        createdAt: true,
        updatedAt: true,
      },
      take: query.limit,
      orderBy: { createdAt: 'desc' },
    });

    return { data: templates };
  });

  // POST /v1/templates
  app.post(
    '/',
    { preHandler: [requireRole('marketer')] },
    async (request, reply) => {
      const { workspaceId } = request.auth;
      const body = request.body as Record<string, unknown>;

      const parsed = createTemplateSchema.safeParse(body);
      if (!parsed.success) {
        return reply.status(422).send({
          error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        });
      }

      const template = await prisma.template.create({
        data: {
          workspaceId,
          ...parsed.data,
          editorJson: parsed.data.editorJson as Parameters<typeof prisma.template.create>[0]['data']['editorJson'],
        },
      });

      return reply.status(201).send(template);
    },
  );

  // GET /v1/templates/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;

    const template = await prisma.template.findFirst({
      where: { id, workspaceId },
    });

    if (!template) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
    }

    return template;
  });

  // PUT /v1/templates/:id
  app.put(
    '/:id',
    { preHandler: [requireRole('marketer')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { workspaceId } = request.auth;

      const existing = await prisma.template.findFirst({
        where: { id, workspaceId },
      });

      if (!existing) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
      }

      const parsed = createTemplateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(422).send({
          error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        });
      }

      const template = await prisma.template.update({
        where: { id },
        data: {
          ...parsed.data,
          editorJson: parsed.data.editorJson as Parameters<typeof prisma.template.update>[0]['data']['editorJson'],
        },
      });
      return template;
    },
  );

  // DELETE /v1/templates/:id
  app.delete(
    '/:id',
    { preHandler: [requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { workspaceId } = request.auth;

      const existing = await prisma.template.findFirst({
        where: { id, workspaceId },
      });

      if (!existing) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
      }

      // Check if template is used by any active campaigns
      const activeCampaigns = await prisma.campaign.count({
        where: {
          templateId: id,
          status: { in: ['SENDING', 'SCHEDULED'] },
        },
      });

      if (activeCampaigns > 0) {
        return reply.status(422).send({
          error: {
            code: 'TEMPLATE_IN_USE',
            message: 'Template is used by active or scheduled campaigns',
          },
        });
      }

      await prisma.template.delete({ where: { id } });
      return reply.status(204).send();
    },
  );
}
