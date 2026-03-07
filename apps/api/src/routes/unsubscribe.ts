/**
 * Unsubscribe Route
 *
 * Public endpoint (no auth required) for processing email unsubscribe requests.
 * Handles both GET (link click from email) and POST (RFC 8058 one-click).
 */

import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import {
  verifyUnsubscribeToken,
  generateUnsubscribeConfirmationPage,
} from '../services/compliance.service.js';

export async function unsubscribeRoutes(app: FastifyInstance) {
  // GET /v1/unsubscribe/:token — Handle unsubscribe link click
  app.get('/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    try {
      const { campaignId, contactId } = verifyUnsubscribeToken(token);

      // Look up contact
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { id: true, email: true, workspaceId: true, status: true },
      });

      if (!contact) {
        return reply
          .status(404)
          .type('text/html')
          .send('<html><body><h1>Contact not found</h1></body></html>');
      }

      // Process unsubscribe (idempotent)
      await prisma.$transaction(async (tx) => {
        // Add to suppression list
        await tx.suppression.upsert({
          where: {
            workspaceId_email: {
              workspaceId: contact.workspaceId,
              email: contact.email,
            },
          },
          update: {
            reason: 'UNSUBSCRIBE',
            sourceCampaignId: campaignId,
            note: 'Unsubscribed via email link',
          },
          create: {
            workspaceId: contact.workspaceId,
            email: contact.email,
            reason: 'UNSUBSCRIBE',
            sourceCampaignId: campaignId,
            note: 'Unsubscribed via email link',
          },
        });

        // Update contact status
        await tx.contact.update({
          where: { id: contactId },
          data: { status: 'UNSUBSCRIBED' },
        });

        // Record the unsubscribe event
        await tx.emailEvent.create({
          data: {
            workspaceId: contact.workspaceId,
            campaignId,
            contactId,
            email: contact.email,
            eventType: 'UNSUBSCRIBED',
            metadata: { source: 'email_link' },
          },
        });
      });

      // Return confirmation page
      const html = generateUnsubscribeConfirmationPage(contact.email);
      return reply.type('text/html').send(html);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid link';
      app.log.warn({ err, token: token.substring(0, 10) + '...' }, 'Invalid unsubscribe token');

      return reply
        .status(400)
        .type('text/html')
        .send(
          `<html><body><h1>Invalid Link</h1><p>${msg}. Please contact support if you need assistance unsubscribing.</p></body></html>`,
        );
    }
  });

  // POST /v1/unsubscribe/:token — RFC 8058 one-click unsubscribe
  app.post('/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    try {
      const { campaignId, contactId } = verifyUnsubscribeToken(token);

      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { id: true, email: true, workspaceId: true },
      });

      if (!contact) {
        return reply.status(404).send({ error: 'Contact not found' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.suppression.upsert({
          where: {
            workspaceId_email: {
              workspaceId: contact.workspaceId,
              email: contact.email,
            },
          },
          update: {
            reason: 'UNSUBSCRIBE',
            sourceCampaignId: campaignId,
            note: 'Unsubscribed via one-click (RFC 8058)',
          },
          create: {
            workspaceId: contact.workspaceId,
            email: contact.email,
            reason: 'UNSUBSCRIBE',
            sourceCampaignId: campaignId,
            note: 'Unsubscribed via one-click (RFC 8058)',
          },
        });

        await tx.contact.update({
          where: { id: contactId },
          data: { status: 'UNSUBSCRIBED' },
        });

        await tx.emailEvent.create({
          data: {
            workspaceId: contact.workspaceId,
            campaignId,
            contactId,
            email: contact.email,
            eventType: 'UNSUBSCRIBED',
            metadata: { source: 'one_click_rfc8058' },
          },
        });
      });

      return reply.status(200).send({ unsubscribed: true });
    } catch {
      return reply.status(400).send({ error: 'Invalid or expired unsubscribe token' });
    }
  });
}
