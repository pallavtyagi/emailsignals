/**
 * Email Sending Worker
 *
 * The core sending pipeline. When a campaign transitions to SENDING,
 * this worker creates SendJob records for each recipient and processes
 * them in batches with rate limiting, warm-up schedule enforcement,
 * template rendering, compliance injection, CSS inlining, and SES delivery.
 */

import { Worker, type Job } from 'bullmq';
import Handlebars from 'handlebars';
import juice from 'juice';
import { prisma } from '../db/client.js';
import * as ses from '../providers/ses.js';
import {
  injectUnsubscribeLink,
  injectCanSpamFooter,
  addListUnsubscribeHeader,
} from '../services/compliance.service.js';
import {
  redisConnection,
  QUEUE_NAMES,
  type EmailSendingJobData,
} from '../queues/index.js';
import { WARMUP_SCHEDULE } from '@signalwave/shared';

// ── Constants ────────────────────────────────────────────────

const DEFAULT_BATCH_SIZE = 50;
const SEND_DELAY_MS = 100; // Delay between individual sends to avoid SES throttling

// ── Worker Logic ─────────────────────────────────────────────

async function processEmailSending(job: Job<EmailSendingJobData>) {
  const { campaignId, workspaceId, batchSize = DEFAULT_BATCH_SIZE } = job.data;

  // Load campaign with all necessary relations
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    include: {
      domain: true,
      template: true,
      lists: true,
      exclusions: true,
    },
  });

  if (!campaign) {
    return { status: 'skipped', reason: 'campaign_not_found' };
  }

  // Only process SENDING campaigns
  if (campaign.status !== 'SENDING') {
    return { status: 'skipped', reason: `campaign_status_${campaign.status}` };
  }

  // Get workspace for CAN-SPAM address
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    return { status: 'error', reason: 'workspace_not_found' };
  }

  // Resolve HTML content
  const rawHtml = campaign.htmlSnapshot || campaign.html || campaign.template?.html;
  if (!rawHtml) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'CANCELLED' },
    });
    return { status: 'error', reason: 'no_html_content' };
  }

  // Check warm-up limits
  const warmupLimit = getWarmupLimit(campaign.domain);

  // Count emails already sent today for this domain
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const sentToday = await prisma.sendJob.count({
    where: {
      campaign: { domainId: campaign.domainId },
      status: 'SENT',
      sentAt: { gte: todayStart },
    },
  });

  const remainingWarmupCapacity = warmupLimit === null ? Infinity : Math.max(0, warmupLimit - sentToday);

  // Check if we have existing send jobs or need to create them
  const existingJobCount = await prisma.sendJob.count({
    where: { campaignId },
  });

  if (existingJobCount === 0) {
    // First time processing: create send jobs for all recipients
    await createSendJobs(campaign, workspaceId);
  }

  // Process queued send jobs in batches
  let processedInThisRun = 0;
  let warmupSentThisRun = 0;
  let allDone = false;

  while (!allDone) {
    // Re-check campaign status (it may have been paused or cancelled)
    const currentCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });

    if (!currentCampaign || currentCampaign.status !== 'SENDING') {
      return { status: 'paused_or_cancelled', processedInThisRun };
    }

    // Check warm-up capacity
    if (warmupLimit !== null && warmupSentThisRun >= remainingWarmupCapacity) {
      // Hit warm-up limit for today. Increment warm-up day and re-schedule for tomorrow.
      if (campaign.domain.warmupEnabled) {
        await prisma.domain.update({
          where: { id: campaign.domainId },
          data: { warmupDay: campaign.domain.warmupDay + 1 },
        });
      }
      return {
        status: 'warmup_limit_reached',
        processedInThisRun,
        warmupLimit,
        sentToday: sentToday + warmupSentThisRun,
      };
    }

    // Fetch next batch of queued jobs
    const effectiveBatchSize = warmupLimit !== null
      ? Math.min(batchSize, remainingWarmupCapacity - warmupSentThisRun)
      : batchSize;

    if (effectiveBatchSize <= 0) break;

    const sendJobs = await prisma.sendJob.findMany({
      where: { campaignId, status: 'QUEUED' },
      take: effectiveBatchSize,
      orderBy: { createdAt: 'asc' },
    });

    if (sendJobs.length === 0) {
      allDone = true;
      break;
    }

    // Compile Handlebars template once per batch
    const template = Handlebars.compile(rawHtml);

    for (const sendJob of sendJobs) {
      try {
        // Mark as sending
        await prisma.sendJob.update({
          where: { id: sendJob.id },
          data: { status: 'SENDING' },
        });

        // Check suppression
        const suppressed = await prisma.suppression.findUnique({
          where: { workspaceId_email: { workspaceId, email: sendJob.email } },
        });

        if (suppressed) {
          await prisma.sendJob.update({
            where: { id: sendJob.id },
            data: { status: 'SKIPPED', error: `Suppressed: ${suppressed.reason}` },
          });
          continue;
        }

        // Load contact data for merge tags
        const contact = await prisma.contact.findUnique({
          where: { id: sendJob.contactId },
        });

        if (!contact || contact.status !== 'SUBSCRIBED') {
          await prisma.sendJob.update({
            where: { id: sendJob.id },
            data: {
              status: 'SKIPPED',
              error: contact ? `Contact status: ${contact.status}` : 'Contact not found',
            },
          });
          continue;
        }

        // Render template with merge tags
        const customFields = (contact.customFields || {}) as Record<string, unknown>;
        const mergeData = {
          email: contact.email,
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          company: contact.company || '',
          phone: contact.phone || '',
          ...customFields,
          unsubscribeUrl: '', // Will be injected by compliance service
        };

        let renderedHtml = template(mergeData);

        // Inject unsubscribe link
        renderedHtml = injectUnsubscribeLink(renderedHtml, campaignId, contact.id);

        // Inject CAN-SPAM footer with workspace physical address
        const address = workspace.physicalAddress || 'Address on file';
        renderedHtml = injectCanSpamFooter(renderedHtml, address);

        // Inline CSS
        renderedHtml = juice(renderedHtml);

        // Build compliance headers
        const complianceHeaders = addListUnsubscribeHeader(campaignId, contact.id);

        // Construct "From" address
        const fromAddress = `${campaign.fromName} <${campaign.fromEmail}>`;

        // Send via SES
        const result = await ses.sendEmail({
          from: fromAddress,
          to: contact.email,
          subject: campaign.subject,
          html: renderedHtml,
          replyTo: campaign.replyTo || undefined,
          headers: complianceHeaders,
          tags: [
            { Name: 'campaign_id', Value: campaignId },
            { Name: 'contact_id', Value: contact.id },
            { Name: 'workspace_id', Value: workspaceId },
          ],
        });

        // Mark as sent
        await prisma.sendJob.update({
          where: { id: sendJob.id },
          data: {
            status: 'SENT',
            sesMessageId: result.messageId,
            sentAt: new Date(),
          },
        });

        // Increment campaign sent count
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { sentCount: { increment: 1 } },
        });

        // Increment subscription usage
        await prisma.subscription.updateMany({
          where: { workspaceId },
          data: { emailsUsed: { increment: 1 } },
        });

        processedInThisRun++;
        warmupSentThisRun++;

        // Small delay to avoid SES throttling
        await sleep(SEND_DELAY_MS);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[email-sending] Failed to send to ${sendJob.email}:`, msg);

        await prisma.sendJob.update({
          where: { id: sendJob.id },
          data: { status: 'FAILED', error: msg },
        });
      }
    }

    // Update job progress
    const totalJobs = await prisma.sendJob.count({ where: { campaignId } });
    const completedJobs = await prisma.sendJob.count({
      where: { campaignId, status: { in: ['SENT', 'FAILED', 'SKIPPED'] } },
    });
    await job.updateProgress(Math.round((completedJobs / totalJobs) * 100));
  }

  // Check if all jobs are complete
  const remainingQueued = await prisma.sendJob.count({
    where: { campaignId, status: { in: ['QUEUED', 'SENDING'] } },
  });

  if (remainingQueued === 0) {
    // All done -- mark campaign as SENT
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        completedAt: new Date(),
      },
    });

    // Increment domain warm-up day
    if (campaign.domain.warmupEnabled) {
      await prisma.domain.update({
        where: { id: campaign.domainId },
        data: { warmupDay: { increment: 1 } },
      });
    }

    return { status: 'completed', processedInThisRun };
  }

  return { status: 'in_progress', processedInThisRun, remainingQueued };
}

// ── Create Send Jobs for Recipients ──────────────────────────

async function createSendJobs(
  campaign: {
    id: string;
    workspaceId: string;
    lists: Array<{ listId: string }>;
    exclusions: Array<{ listId: string }>;
  },
  workspaceId: string,
) {
  const listIds = campaign.lists.map((l) => l.listId);
  const exclusionListIds = campaign.exclusions.map((e) => e.listId);

  // Get all subscribed contacts from included lists
  const memberships = await prisma.contactListMembership.findMany({
    where: {
      listId: { in: listIds },
      contact: {
        workspaceId,
        status: 'SUBSCRIBED',
      },
    },
    include: {
      contact: { select: { id: true, email: true } },
    },
  });

  // Deduplicate by contact ID
  const contactMap = new Map<string, { id: string; email: string }>();
  for (const m of memberships) {
    contactMap.set(m.contact.id, m.contact);
  }

  // Remove contacts in exclusion lists
  if (exclusionListIds.length > 0) {
    const exclusionMemberships = await prisma.contactListMembership.findMany({
      where: { listId: { in: exclusionListIds } },
      select: { contactId: true },
    });
    for (const em of exclusionMemberships) {
      contactMap.delete(em.contactId);
    }
  }

  // Remove suppressed contacts
  const emails = Array.from(contactMap.values()).map((c) => c.email);
  if (emails.length > 0) {
    const suppressions = await prisma.suppression.findMany({
      where: { workspaceId, email: { in: emails } },
      select: { email: true },
    });
    const suppressedEmails = new Set(suppressions.map((s) => s.email));

    for (const [contactId, contact] of contactMap.entries()) {
      if (suppressedEmails.has(contact.email)) {
        contactMap.delete(contactId);
      }
    }
  }

  // Create send jobs in batches
  const contacts = Array.from(contactMap.values());
  const BATCH_SIZE = 500;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    await prisma.sendJob.createMany({
      data: batch.map((contact) => ({
        campaignId: campaign.id,
        contactId: contact.id,
        email: contact.email,
        status: 'QUEUED' as const,
      })),
    });
  }

  // Update campaign with actual estimated recipients
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { estimatedRecipients: contacts.length },
  });

  console.log(
    `[email-sending] Created ${contacts.length} send jobs for campaign ${campaign.id}`,
  );
}

// ── Warm-up Schedule ─────────────────────────────────────────

function getWarmupLimit(
  domain: { warmupEnabled: boolean; warmupDay: number },
): number | null {
  if (!domain.warmupEnabled) return null;

  const day = domain.warmupDay;

  // Find the appropriate limit from the schedule
  const days = Object.keys(WARMUP_SCHEDULE)
    .map(Number)
    .sort((a, b) => a - b);

  if (day > days[days.length - 1]) {
    // Past warm-up period, no limit
    return null;
  }

  // Find the matching or previous day's limit
  let limit = WARMUP_SCHEDULE[1] || 50;
  for (const d of days) {
    if (d <= day) {
      limit = WARMUP_SCHEDULE[d];
    } else {
      break;
    }
  }

  return limit;
}

// ── Helpers ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Worker Factory ───────────────────────────────────────────

export function createEmailSendingWorker() {
  const worker = new Worker<EmailSendingJobData>(
    QUEUE_NAMES.EMAIL_SENDING,
    processEmailSending,
    {
      connection: redisConnection,
      concurrency: 2, // Process max 2 campaigns simultaneously
      lockDuration: 600000, // 10 minute lock (sending takes a while)
    },
  );

  worker.on('completed', (job, result) => {
    console.log(`[email-sending] Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, err) => {
    console.error(`[email-sending] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
