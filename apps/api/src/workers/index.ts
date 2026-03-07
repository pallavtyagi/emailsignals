/**
 * Worker Registration
 *
 * Creates and starts all BullMQ workers. Called during server startup.
 * Returns cleanup functions for graceful shutdown.
 */

import type { Worker } from 'bullmq';
import { createDomainVerificationWorker } from './domain-verification.worker.js';
import { createCsvImportWorker } from './csv-import.worker.js';
import { createEmailSendingWorker } from './email-sending.worker.js';
import { createScheduledCampaignsWorker } from './scheduled-campaigns.worker.js';

let workers: Worker[] = [];

/**
 * Start all background workers.
 */
export function startAllWorkers(): void {
  console.log('[workers] Starting all background workers...');

  const domainVerificationWorker = createDomainVerificationWorker();
  const csvImportWorker = createCsvImportWorker();
  const emailSendingWorker = createEmailSendingWorker();
  const scheduledCampaignsWorker = createScheduledCampaignsWorker();

  workers = [
    domainVerificationWorker,
    csvImportWorker,
    emailSendingWorker,
    scheduledCampaignsWorker,
  ];

  console.log(`[workers] Started ${workers.length} workers`);
}

/**
 * Gracefully shut down all workers.
 */
export async function stopAllWorkers(): Promise<void> {
  console.log('[workers] Stopping all workers...');

  await Promise.all(
    workers.map(async (worker) => {
      try {
        await worker.close();
      } catch (err) {
        console.error(`[workers] Error closing worker ${worker.name}:`, err);
      }
    }),
  );

  workers = [];
  console.log('[workers] All workers stopped');
}
