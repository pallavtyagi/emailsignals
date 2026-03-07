/**
 * Campaign Service
 *
 * Campaign lifecycle management including creation with validation,
 * estimated recipient calculation, state machine transitions, and duplication.
 */

import { prisma } from '../db/client.js';
import {
  NotFoundError,
  ValidationError,
  BadRequestError,
} from '../lib/errors.js';
import { emailSendingQueue, scheduledCampaignsQueue } from '../queues/index.js';
import type { Prisma } from '@prisma/client';

// ── Types ────────────────────────────────────────────────────

export interface CreateCampaignParams {
  workspaceId: string;
  name: string;
  type?: string;
  subject: string;
  previewText?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  domainId: string;
  templateId?: string;
  html?: string;
  listIds: string[];
  exclusionListIds?: string[];
  utmParams?: Record<string, string>;
  tags?: string[];
}

export interface UpdateCampaignParams {
  name?: string;
  subject?: string;
  previewText?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  html?: string;
  templateId?: string;
  utmParams?: Record<string, string>;
  tags?: string[];
}

// ── Valid State Transitions ──────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SCHEDULED', 'SENDING'],
  SCHEDULED: ['SENDING', 'DRAFT', 'CANCELLED'],
  SENDING: ['SENT', 'PAUSED', 'CANCELLED'],
  PAUSED: ['SENDING', 'CANCELLED'],
  SENT: [], // Terminal state
  CANCELLED: [], // Terminal state
};

// ── Service ──────────────────────────────────────────────────

/**
 * Create a new campaign with full validation.
 */
export async function createCampaign(params: CreateCampaignParams) {
  // Verify domain is verified and belongs to workspace
  const domain = await prisma.domain.findFirst({
    where: { id: params.domainId, workspaceId: params.workspaceId },
  });

  if (!domain) {
    throw new NotFoundError('Domain', params.domainId);
  }

  if (domain.status !== 'VERIFIED') {
    throw new ValidationError('Domain must be verified before creating a campaign');
  }

  // Verify all lists exist and belong to workspace
  const lists = await prisma.contactList.findMany({
    where: { id: { in: params.listIds }, workspaceId: params.workspaceId },
    select: { id: true },
  });

  if (lists.length !== params.listIds.length) {
    throw new ValidationError('One or more contact lists not found in this workspace');
  }

  // Verify exclusion lists if specified
  if (params.exclusionListIds?.length) {
    const exclusionLists = await prisma.contactList.findMany({
      where: { id: { in: params.exclusionListIds }, workspaceId: params.workspaceId },
      select: { id: true },
    });
    if (exclusionLists.length !== params.exclusionListIds.length) {
      throw new ValidationError('One or more exclusion lists not found in this workspace');
    }
  }

  // Verify template if specified
  if (params.templateId) {
    const template = await prisma.template.findFirst({
      where: { id: params.templateId, workspaceId: params.workspaceId },
    });
    if (!template) {
      throw new NotFoundError('Template', params.templateId);
    }
  }

  // Must have either html or templateId
  if (!params.html && !params.templateId) {
    throw new ValidationError('Campaign must have either HTML content or a template');
  }

  // Calculate estimated recipients
  const estimatedRecipients = await calculateEstimatedRecipients(
    params.workspaceId,
    params.listIds,
    params.exclusionListIds,
  );

  const campaignType = (params.type || 'blast').toUpperCase() as 'BLAST' | 'SCHEDULED' | 'AB_TEST';

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: params.workspaceId,
      name: params.name,
      type: campaignType,
      subject: params.subject,
      previewText: params.previewText,
      fromName: params.fromName,
      fromEmail: params.fromEmail,
      replyTo: params.replyTo,
      domainId: params.domainId,
      templateId: params.templateId,
      html: params.html,
      utmParams: params.utmParams as Prisma.InputJsonValue,
      tags: params.tags ?? [],
      estimatedRecipients,
      lists: {
        create: params.listIds.map((listId) => ({ listId })),
      },
      exclusions: params.exclusionListIds?.length
        ? { create: params.exclusionListIds.map((listId) => ({ listId })) }
        : undefined,
    },
  });

  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    estimatedRecipients,
    createdAt: campaign.createdAt,
  };
}

/**
 * Update a campaign that is in DRAFT or SCHEDULED status.
 */
export async function updateCampaign(
  campaignId: string,
  workspaceId: string,
  data: UpdateCampaignParams,
) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign', campaignId);
  }

  if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
    throw new ValidationError('Can only update draft or scheduled campaigns');
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.subject !== undefined ? { subject: data.subject } : {}),
      ...(data.previewText !== undefined ? { previewText: data.previewText } : {}),
      ...(data.fromName !== undefined ? { fromName: data.fromName } : {}),
      ...(data.fromEmail !== undefined ? { fromEmail: data.fromEmail } : {}),
      ...(data.replyTo !== undefined ? { replyTo: data.replyTo } : {}),
      ...(data.html !== undefined ? { html: data.html } : {}),
      ...(data.templateId !== undefined ? { templateId: data.templateId } : {}),
      ...(data.utmParams !== undefined ? { utmParams: data.utmParams as Prisma.InputJsonValue } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
    },
  });

  return updated;
}

/**
 * Transition campaign to SENDING or SCHEDULED state.
 */
export async function sendCampaign(
  campaignId: string,
  workspaceId: string,
  options?: { sendAt?: string; timezone?: string },
) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    include: { domain: true, lists: true },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign', campaignId);
  }

  // Validate state transition
  const targetStatus = options?.sendAt ? 'SCHEDULED' : 'SENDING';
  validateTransition(campaign.status, targetStatus);

  // Verify domain is still verified
  if (campaign.domain.status !== 'VERIFIED') {
    throw new ValidationError('Domain is no longer verified. Please re-verify before sending.');
  }

  // Must have HTML content
  const html = campaign.html || (campaign.templateId
    ? (await prisma.template.findUnique({ where: { id: campaign.templateId } }))?.html
    : null);

  if (!html) {
    throw new ValidationError('Campaign must have HTML content before sending');
  }

  // Recalculate recipients
  const listIds = campaign.lists.map((l) => l.listId);
  const exclusions = await prisma.campaignExclusion.findMany({
    where: { campaignId },
    select: { listId: true },
  });
  const exclusionListIds = exclusions.map((e) => e.listId);
  const estimatedRecipients = await calculateEstimatedRecipients(
    workspaceId,
    listIds,
    exclusionListIds,
  );

  if (estimatedRecipients === 0) {
    throw new ValidationError('No recipients found. Add contacts to the campaign lists first.');
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: targetStatus as 'SENDING' | 'SCHEDULED',
      scheduledAt: options?.sendAt ? new Date(options.sendAt) : null,
      sentAt: targetStatus === 'SENDING' ? new Date() : null,
      htmlSnapshot: html, // Freeze HTML at send time
      estimatedRecipients,
    },
  });

  // Enqueue for processing
  if (targetStatus === 'SENDING') {
    await emailSendingQueue.add(
      'send-campaign',
      { campaignId, workspaceId },
      { jobId: `send-${campaignId}` },
    );
  } else if (targetStatus === 'SCHEDULED' && options?.sendAt) {
    const delay = new Date(options.sendAt).getTime() - Date.now();
    await scheduledCampaignsQueue.add(
      'scheduled-campaign',
      { campaignId, workspaceId },
      { delay: Math.max(delay, 0), jobId: `scheduled-${campaignId}` },
    );
  }

  return {
    id: updated.id,
    status: updated.status,
    scheduledAt: updated.scheduledAt,
    estimatedRecipients: updated.estimatedRecipients,
  };
}

/**
 * Pause a sending campaign.
 */
export async function pauseCampaign(campaignId: string, workspaceId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign', campaignId);
  }

  validateTransition(campaign.status, 'PAUSED');

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'PAUSED' },
  });

  return { id: updated.id, status: updated.status, sentCount: updated.sentCount };
}

/**
 * Resume a paused campaign.
 */
export async function resumeCampaign(campaignId: string, workspaceId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign', campaignId);
  }

  validateTransition(campaign.status, 'SENDING');

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'SENDING' },
  });

  // Re-enqueue for processing
  await emailSendingQueue.add(
    'send-campaign',
    { campaignId, workspaceId },
    { jobId: `send-${campaignId}-resume-${Date.now()}` },
  );

  return { id: updated.id, status: updated.status };
}

/**
 * Cancel a campaign.
 */
export async function cancelCampaign(campaignId: string, workspaceId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign', campaignId);
  }

  validateTransition(campaign.status, 'CANCELLED');

  // Mark queued send jobs as skipped
  await prisma.sendJob.updateMany({
    where: { campaignId, status: 'QUEUED' },
    data: { status: 'SKIPPED' },
  });

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'CANCELLED' },
  });

  return { id: updated.id, status: updated.status, sentCount: updated.sentCount };
}

/**
 * Duplicate a campaign as a new DRAFT.
 */
export async function duplicateCampaign(campaignId: string, workspaceId: string) {
  const original = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    include: { lists: true, exclusions: true },
  });

  if (!original) {
    throw new NotFoundError('Campaign', campaignId);
  }

  const duplicate = await prisma.campaign.create({
    data: {
      workspaceId: original.workspaceId,
      name: `${original.name} (Copy)`,
      type: original.type,
      subject: original.subject,
      previewText: original.previewText,
      fromName: original.fromName,
      fromEmail: original.fromEmail,
      replyTo: original.replyTo,
      domainId: original.domainId,
      templateId: original.templateId,
      html: original.html,
      utmParams: original.utmParams as Prisma.InputJsonValue,
      tags: original.tags,
      estimatedRecipients: original.estimatedRecipients,
      lists: {
        create: original.lists.map((l) => ({ listId: l.listId })),
      },
      exclusions: original.exclusions.length > 0
        ? { create: original.exclusions.map((e) => ({ listId: e.listId })) }
        : undefined,
    },
  });

  return duplicate;
}

/**
 * Get a campaign with all related data.
 */
export async function getCampaign(campaignId: string, workspaceId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    include: {
      domain: true,
      template: true,
      lists: { include: { list: true } },
      exclusions: { include: { list: true } },
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign', campaignId);
  }

  return campaign;
}

// ── Internal Helpers ─────────────────────────────────────────

function validateTransition(currentStatus: string, targetStatus: string) {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new ValidationError(
      `Cannot transition campaign from '${currentStatus}' to '${targetStatus}'`,
    );
  }
}

/**
 * Calculate estimated recipients: contacts in included lists, minus those
 * in exclusion lists, minus suppressions, minus unsubscribed/bounced contacts.
 */
async function calculateEstimatedRecipients(
  workspaceId: string,
  listIds: string[],
  exclusionListIds?: string[],
): Promise<number> {
  if (listIds.length === 0) return 0;

  // Get contacts in included lists
  const includedContacts = await prisma.contactListMembership.findMany({
    where: {
      listId: { in: listIds },
      contact: {
        workspaceId,
        status: 'SUBSCRIBED',
      },
    },
    select: { contactId: true },
    distinct: ['contactId'],
  });

  const includedIds = new Set(includedContacts.map((c) => c.contactId));

  // Remove excluded list contacts
  if (exclusionListIds?.length) {
    const excludedContacts = await prisma.contactListMembership.findMany({
      where: { listId: { in: exclusionListIds } },
      select: { contactId: true },
    });
    for (const ec of excludedContacts) {
      includedIds.delete(ec.contactId);
    }
  }

  // Remove suppressed contacts
  if (includedIds.size > 0) {
    const contactEmails = await prisma.contact.findMany({
      where: { id: { in: Array.from(includedIds) } },
      select: { id: true, email: true },
    });

    const emailToId = new Map(contactEmails.map((c) => [c.email, c.id]));
    const emails = Array.from(emailToId.keys());

    if (emails.length > 0) {
      const suppressions = await prisma.suppression.findMany({
        where: { workspaceId, email: { in: emails } },
        select: { email: true },
      });

      for (const s of suppressions) {
        const contactId = emailToId.get(s.email);
        if (contactId) {
          includedIds.delete(contactId);
        }
      }
    }
  }

  return includedIds.size;
}
