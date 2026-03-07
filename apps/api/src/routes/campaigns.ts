import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import {
  createCampaignSchema,
  updateCampaignSchema,
  sendCampaignSchema,
  testSendSchema,
  campaignQuerySchema,
} from '@signalwave/shared';
import { requireRole } from '../middleware/auth.js';
import * as campaignService from '../services/campaign.service.js';
import * as ses from '../providers/ses.js';
import {
  injectUnsubscribeLink,
  injectCanSpamFooter,
} from '../services/compliance.service.js';
import juice from 'juice';
import Handlebars from 'handlebars';

export async function campaignRoutes(app: FastifyInstance) {
  // GET /v1/campaigns
  app.get('/', async (request) => {
    const { workspaceId } = request.auth;
    const query = campaignQuerySchema.parse(request.query);

    const where: Record<string, unknown> = { workspaceId };
    if (query.status) where.status = query.status.toUpperCase();

    const campaigns = await prisma.campaign.findMany({
      where: where as Parameters<typeof prisma.campaign.findMany>[0]['where'],
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      ...(query.after ? { cursor: { id: query.after }, skip: 1 } : {}),
    });

    const total = await prisma.campaign.count({
      where: where as Parameters<typeof prisma.campaign.count>[0]['where'],
    });

    return {
      data: campaigns,
      total,
      nextCursor:
        campaigns.length === query.limit ? campaigns[campaigns.length - 1]?.id : null,
    };
  });

  // POST /v1/campaigns
  app.post(
    '/',
    { preHandler: [requireRole('marketer')] },
    async (request, reply) => {
      const { workspaceId } = request.auth;
      const body = request.body as Record<string, unknown>;

      const parsed = createCampaignSchema.safeParse(body);
      if (!parsed.success) {
        return reply.status(422).send({
          error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        });
      }

      const result = await campaignService.createCampaign({
        workspaceId,
        name: parsed.data.name,
        type: parsed.data.type,
        subject: parsed.data.subject,
        previewText: parsed.data.previewText,
        fromName: parsed.data.fromName,
        fromEmail: parsed.data.fromEmail,
        replyTo: parsed.data.replyTo,
        domainId: parsed.data.domainId,
        templateId: parsed.data.templateId,
        html: parsed.data.html,
        listIds: parsed.data.listIds,
        exclusionListIds: parsed.data.exclusionListIds,
        utmParams: parsed.data.utmParams as Record<string, string> | undefined,
        tags: parsed.data.tags,
      });

      return reply.status(201).send(result);
    },
  );

  // GET /v1/campaigns/:id
  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;

    const campaign = await campaignService.getCampaign(id, workspaceId);
    return campaign;
  });

  // PATCH /v1/campaigns/:id
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;

    const parsed = updateCampaignSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      });
    }

    const updated = await campaignService.updateCampaign(id, workspaceId, {
      name: parsed.data.name,
      subject: parsed.data.subject,
      previewText: parsed.data.previewText,
      fromName: parsed.data.fromName,
      fromEmail: parsed.data.fromEmail,
      replyTo: parsed.data.replyTo,
      html: parsed.data.html,
      templateId: parsed.data.templateId,
      utmParams: parsed.data.utmParams as Record<string, string> | undefined,
      tags: parsed.data.tags,
    });

    return updated;
  });

  // POST /v1/campaigns/:id/send
  app.post(
    '/:id/send',
    { preHandler: [requireRole('marketer')] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { workspaceId } = request.auth;
      const parsed = sendCampaignSchema.safeParse(request.body || {});

      const options = parsed.success
        ? { sendAt: parsed.data.sendAt, timezone: parsed.data.timezone }
        : undefined;

      const result = await campaignService.sendCampaign(id, workspaceId, options);
      return result;
    },
  );

  // POST /v1/campaigns/:id/pause
  app.post(
    '/:id/pause',
    { preHandler: [requireRole('marketer')] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { workspaceId } = request.auth;

      const result = await campaignService.pauseCampaign(id, workspaceId);
      return result;
    },
  );

  // POST /v1/campaigns/:id/resume
  app.post(
    '/:id/resume',
    { preHandler: [requireRole('marketer')] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { workspaceId } = request.auth;

      const result = await campaignService.resumeCampaign(id, workspaceId);
      return result;
    },
  );

  // POST /v1/campaigns/:id/cancel
  app.post(
    '/:id/cancel',
    { preHandler: [requireRole('admin')] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { workspaceId } = request.auth;

      const result = await campaignService.cancelCampaign(id, workspaceId);
      return result;
    },
  );

  // POST /v1/campaigns/:id/duplicate
  app.post('/:id/duplicate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;

    const duplicate = await campaignService.duplicateCampaign(id, workspaceId);
    return reply.status(201).send(duplicate);
  });

  // POST /v1/campaigns/:id/test
  app.post('/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;

    const parsed = testSendSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
      include: { template: true },
    });

    if (!campaign) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
    }

    const rawHtml = campaign.html || campaign.template?.html;
    if (!rawHtml) {
      return reply.status(422).send({
        error: { code: 'NO_CONTENT', message: 'Campaign has no HTML content' },
      });
    }

    // Get workspace for physical address
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    // Load test contact data if provided
    let mergeData: Record<string, unknown> = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      company: 'Test Company',
    };

    if (parsed.data.testContactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: parsed.data.testContactId, workspaceId },
      });
      if (contact) {
        mergeData = {
          email: contact.email,
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          company: contact.company || '',
          phone: contact.phone || '',
          ...(contact.customFields as Record<string, unknown> || {}),
        };
      }
    }

    // Render template
    const template = Handlebars.compile(rawHtml);
    let renderedHtml = template(mergeData);

    // Inject compliance elements
    renderedHtml = injectUnsubscribeLink(renderedHtml, id, 'test-contact');
    renderedHtml = injectCanSpamFooter(
      renderedHtml,
      workspace?.physicalAddress || 'Test Address',
    );
    renderedHtml = juice(renderedHtml);

    // Send test emails
    const results: Array<{ email: string; status: string; error?: string }> = [];

    for (const email of parsed.data.to) {
      try {
        await ses.sendEmail({
          from: `${campaign.fromName} <${campaign.fromEmail}>`,
          to: email,
          subject: `[TEST] ${campaign.subject}`,
          html: renderedHtml,
          replyTo: campaign.replyTo || undefined,
          tags: [
            { Name: 'campaign_id', Value: id },
            { Name: 'workspace_id', Value: workspaceId },
            { Name: 'type', Value: 'test' },
          ],
        });
        results.push({ email, status: 'sent' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ email, status: 'failed', error: msg });
      }
    }

    return { sentTo: parsed.data.to, results, message: 'Test emails dispatched' };
  });
}
