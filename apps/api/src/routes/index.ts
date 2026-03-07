import type { FastifyInstance } from 'fastify';
import { domainRoutes } from './domains.js';
import { contactRoutes } from './contacts.js';
import { campaignRoutes } from './campaigns.js';
import { templateRoutes } from './templates.js';
import { analyticsRoutes } from './analytics.js';
import { billingRoutes } from './billing.js';
import { webhookRoutes } from './webhooks.js';
import { aiRoutes } from './ai.js';
import { unsubscribeRoutes } from './unsubscribe.js';
import { queueRoutes } from './queues.js';

export async function registerRoutes(app: FastifyInstance) {
  // API v1 routes
  await app.register(
    async (api) => {
      await api.register(domainRoutes, { prefix: '/domains' });
      await api.register(contactRoutes, { prefix: '/contacts' });
      await api.register(campaignRoutes, { prefix: '/campaigns' });
      await api.register(templateRoutes, { prefix: '/templates' });
      await api.register(analyticsRoutes, { prefix: '/analytics' });
      await api.register(billingRoutes, { prefix: '/billing' });
      await api.register(webhookRoutes, { prefix: '/webhooks' });
      await api.register(aiRoutes, { prefix: '/ai' });
      await api.register(unsubscribeRoutes, { prefix: '/unsubscribe' });
      await api.register(queueRoutes, { prefix: '/queues' });
    },
    { prefix: '/v1' },
  );
}
