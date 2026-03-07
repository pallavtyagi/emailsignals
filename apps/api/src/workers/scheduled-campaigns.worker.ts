/**
 * Scheduled Campaigns Worker
 *
 * Processes campaigns that were scheduled for a future time.
 * When the scheduled time arrives, transitions the campaign to SENDING
 * and enqueues it for the email sending worker.
 */

import { Worker, type Job } from 'bullmq';
import { prisma } from '../db/client.js';
import { emailSendingQueue } from '../queues/index.js';
import {
  redisConnection,
  QUEUE_NAMES,
  type ScheduledCampaignJobData,
} from '../queues/index.js';

async function processScheduledCampaign(job: Job<ScheduledCampaignJobData>) {
  const { campaignId, workspaceId } = job.data;

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
  });

  if (!campaign) {
    return { status: 'skipped', reason: 'campaign_not_found' };
  }

  // Only process SCHEDULED campaigns
  if (campaign.status !== 'SCHEDULED') {
    return { status: 'skipped', reason: `campaign_status_${campaign.status}` };
  }

  // Check if scheduled time has arrived
  if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
    // Re-enqueue with remaining delay
    const delay = campaign.scheduledAt.getTime() - Date.now();
    await job.moveToDelayed(Date.now() + delay);
    return { status: 'delayed', scheduledAt: campaign.scheduledAt };
  }

  // Transition to SENDING
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: 'SENDING',
      sentAt: new Date(),
    },
  });

  // Enqueue for email sending
  await emailSendingQueue.add(
    'send-campaign',
    { campaignId, workspaceId },
    { jobId: `send-${campaignId}` },
  );

  console.log(
    `[scheduled-campaigns] Campaign ${campaignId} transitioned to SENDING`,
  );

  return { status: 'triggered', campaignId };
}

// ── Worker Factory ───────────────────────────────────────────

export function createScheduledCampaignsWorker() {
  const worker = new Worker<ScheduledCampaignJobData>(
    QUEUE_NAMES.SCHEDULED_CAMPAIGNS,
    processScheduledCampaign,
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );

  worker.on('completed', (job, result) => {
    console.log(`[scheduled-campaigns] Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, err) => {
    console.error(`[scheduled-campaigns] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
