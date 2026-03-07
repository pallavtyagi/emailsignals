/**
 * BullMQ Queue Setup
 *
 * Initializes Redis connection and creates all application queues.
 * Queues are used for domain verification polling, CSV import processing,
 * email sending, and scheduled campaign dispatching.
 */

import { Queue, type ConnectionOptions } from 'bullmq';

// ── Redis Connection ─────────────────────────────────────────

function getRedisConnection(): ConnectionOptions {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

export const redisConnection = getRedisConnection();

// ── Queue Names ──────────────────────────────────────────────

export const QUEUE_NAMES = {
  DOMAIN_VERIFICATION: 'domain-verification',
  CSV_IMPORT: 'csv-import',
  EMAIL_SENDING: 'email-sending',
  SCHEDULED_CAMPAIGNS: 'scheduled-campaigns',
} as const;

// ── Queue Instances ──────────────────────────────────────────

export const domainVerificationQueue = new Queue(QUEUE_NAMES.DOMAIN_VERIFICATION, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

export const csvImportQueue = new Queue(QUEUE_NAMES.CSV_IMPORT, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 200 },
    attempts: 1, // CSV imports should not retry (risk of duplicates)
  },
});

export const emailSendingQueue = new Queue(QUEUE_NAMES.EMAIL_SENDING, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
  },
});

export const scheduledCampaignsQueue = new Queue(QUEUE_NAMES.SCHEDULED_CAMPAIGNS, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
    attempts: 5,
    backoff: { type: 'exponential', delay: 30000 },
  },
});

// ── Job Types ────────────────────────────────────────────────

export interface DomainVerificationJobData {
  domainId: string;
  workspaceId: string;
}

export interface CsvImportJobData {
  importJobId: string;
  workspaceId: string;
  fileContent: string; // Base64-encoded CSV content
  fieldMapping: Array<{ csvColumn: string; contactField: string }>;
  listIds?: string[];
  onDuplicate: 'update' | 'skip';
}

export interface EmailSendingJobData {
  campaignId: string;
  workspaceId: string;
  batchSize?: number;
}

export interface ScheduledCampaignJobData {
  campaignId: string;
  workspaceId: string;
}

// ── Queue Status Helper ──────────────────────────────────────

export async function getQueueStatus() {
  const [domainCounts, csvCounts, emailCounts, scheduledCounts] = await Promise.all([
    domainVerificationQueue.getJobCounts(),
    csvImportQueue.getJobCounts(),
    emailSendingQueue.getJobCounts(),
    scheduledCampaignsQueue.getJobCounts(),
  ]);

  return {
    [QUEUE_NAMES.DOMAIN_VERIFICATION]: domainCounts,
    [QUEUE_NAMES.CSV_IMPORT]: csvCounts,
    [QUEUE_NAMES.EMAIL_SENDING]: emailCounts,
    [QUEUE_NAMES.SCHEDULED_CAMPAIGNS]: scheduledCounts,
  };
}

// ── Graceful Shutdown ────────────────────────────────────────

export async function closeAllQueues() {
  await Promise.all([
    domainVerificationQueue.close(),
    csvImportQueue.close(),
    emailSendingQueue.close(),
    scheduledCampaignsQueue.close(),
  ]);
}
