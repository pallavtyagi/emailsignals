import type { FastifyInstance } from 'fastify';
import { requireRole } from '../middleware/auth.js';
import * as billingService from '../services/billing.service.js';

export async function billingRoutes(app: FastifyInstance) {
  // GET /v1/billing/subscription
  app.get('/subscription', async (request, reply) => {
    const { workspaceId } = request.auth;

    const { prisma } = await import('../db/client.js');
    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId },
    });

    if (!subscription) {
      return reply.status(404).send({
        error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription' },
      });
    }

    return subscription;
  });

  // GET /v1/billing/usage
  app.get('/usage', async (request) => {
    const { workspaceId } = request.auth;
    const usage = await billingService.getUsageSummary(workspaceId);
    return usage;
  });

  // POST /v1/billing/checkout
  app.post(
    '/checkout',
    { preHandler: [requireRole('admin')] },
    async (request) => {
      const { workspaceId } = request.auth;
      const { plan } = request.body as { plan: string };

      const result = await billingService.createCheckoutSession(workspaceId, plan);
      return result;
    },
  );

  // POST /v1/billing/portal
  app.post(
    '/portal',
    { preHandler: [requireRole('admin')] },
    async (request) => {
      const { workspaceId } = request.auth;
      const result = await billingService.createPortalSession(workspaceId);
      return result;
    },
  );

  // POST /v1/billing/webhook — Stripe webhook handler
  // This route is NOT behind auth middleware (Stripe sends the requests directly)
  app.post(
    '/webhook',
    {
      config: {
        rawBody: true,
      },
    },
    async (request, reply) => {
      const signature = request.headers['stripe-signature'] as string;
      if (!signature) {
        return reply.status(400).send({ error: { code: 'MISSING_SIGNATURE' } });
      }

      try {
        // Get raw body for signature verification
        const rawBody = (request as unknown as { rawBody?: Buffer }).rawBody;
        if (!rawBody) {
          return reply.status(400).send({
            error: { code: 'MISSING_BODY', message: 'Raw body required for webhook verification' },
          });
        }

        const event = billingService.constructWebhookEvent(rawBody, signature);
        const result = await billingService.handleWebhookEvent(event);

        return reply.status(200).send({ received: true, handled: result.handled });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        request.log.error({ err }, 'Stripe webhook processing failed');
        return reply.status(400).send({
          error: { code: 'WEBHOOK_ERROR', message: msg },
        });
      }
    },
  );
}
