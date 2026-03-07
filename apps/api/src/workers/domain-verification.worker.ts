/**
 * Domain Verification Worker
 *
 * BullMQ worker that periodically checks pending domain verification status
 * via AWS SES. When all DNS records (SPF, DKIM, DMARC) are verified, the
 * domain status is updated to VERIFIED. Failed verifications after timeout
 * are marked as FAILED.
 */

import { Worker, type Job } from 'bullmq';
import { prisma } from '../db/client.js';
import * as ses from '../providers/ses.js';
import {
  redisConnection,
  QUEUE_NAMES,
  domainVerificationQueue,
  type DomainVerificationJobData,
} from '../queues/index.js';

// Max verification attempts before marking as failed (5 min intervals * 288 = 24 hours)
const MAX_VERIFICATION_ATTEMPTS = 288;

async function processDomainVerification(job: Job<DomainVerificationJobData>) {
  const { domainId, workspaceId } = job.data;
  const attemptNumber = job.attemptsStarted || 1;

  const domainRecord = await prisma.domain.findFirst({
    where: { id: domainId, workspaceId },
  });

  if (!domainRecord) {
    // Domain was deleted, nothing to do
    return { status: 'skipped', reason: 'domain_not_found' };
  }

  // Already verified or failed -- no further action needed
  if (domainRecord.status === 'VERIFIED') {
    return { status: 'skipped', reason: 'already_verified' };
  }
  if (domainRecord.status === 'FAILED') {
    return { status: 'skipped', reason: 'already_failed' };
  }

  // Query SES for current verification status
  let verification: ses.IdentityVerificationStatus;
  try {
    verification = await ses.getEmailIdentity(domainRecord.domain);
  } catch (err) {
    console.error(`[domain-verification] SES check failed for ${domainRecord.domain}:`, err);

    // Re-enqueue for retry if under max attempts
    if (attemptNumber < MAX_VERIFICATION_ATTEMPTS) {
      await domainVerificationQueue.add(
        'verify',
        { domainId, workspaceId },
        { delay: 5 * 60 * 1000, jobId: `domain-verify-${domainId}-${attemptNumber + 1}` },
      );
    }

    return { status: 'retry', reason: 'ses_check_failed' };
  }

  const dkimValid = verification.dkimStatus === 'SUCCESS';
  const allValid = verification.verified && verification.spfValid && dkimValid;
  const dkimFailed = verification.dkimStatus === 'FAILED';

  // Update domain record
  const newStatus = allValid
    ? 'VERIFIED'
    : dkimFailed
      ? 'FAILED'
      : 'PENDING';

  await prisma.domain.update({
    where: { id: domainId },
    data: {
      spfValid: verification.spfValid,
      dkimValid,
      dmarcValid: verification.dmarcValid,
      status: newStatus as 'PENDING' | 'VERIFIED' | 'DEGRADED' | 'FAILED',
      ...(newStatus === 'VERIFIED' ? { verifiedAt: new Date() } : {}),
      dnsRecords: {
        spf: {
          type: 'TXT',
          name: domainRecord.domain,
          value: 'v=spf1 include:amazonses.com ~all',
          purpose: 'spf',
        },
        dkim: verification.dkimRecords,
        dmarc: {
          type: 'TXT',
          name: `_dmarc.${domainRecord.domain}`,
          value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@signalwave.com',
          purpose: 'dmarc',
        },
      },
    },
  });

  if (newStatus === 'VERIFIED') {
    console.log(`[domain-verification] Domain ${domainRecord.domain} verified successfully`);
    return { status: 'verified', domain: domainRecord.domain };
  }

  if (newStatus === 'FAILED') {
    console.log(`[domain-verification] Domain ${domainRecord.domain} verification failed`);
    return { status: 'failed', domain: domainRecord.domain };
  }

  // Still pending -- schedule next check in 5 minutes
  if (attemptNumber < MAX_VERIFICATION_ATTEMPTS) {
    await domainVerificationQueue.add(
      'verify',
      { domainId, workspaceId },
      {
        delay: 5 * 60 * 1000,
        jobId: `domain-verify-${domainId}-${attemptNumber + 1}`,
      },
    );
  } else {
    // Max attempts reached, mark as failed
    await prisma.domain.update({
      where: { id: domainId },
      data: { status: 'FAILED' },
    });
    console.log(
      `[domain-verification] Domain ${domainRecord.domain} timed out after ${MAX_VERIFICATION_ATTEMPTS} attempts`,
    );
    return { status: 'timeout', domain: domainRecord.domain };
  }

  return { status: 'pending', domain: domainRecord.domain, attempt: attemptNumber };
}

// ── Worker Factory ───────────────────────────────────────────

export function createDomainVerificationWorker() {
  const worker = new Worker<DomainVerificationJobData>(
    QUEUE_NAMES.DOMAIN_VERIFICATION,
    processDomainVerification,
    {
      connection: redisConnection,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute to avoid SES throttling
      },
    },
  );

  worker.on('completed', (job, result) => {
    if (result && typeof result === 'object' && 'status' in result) {
      const r = result as Record<string, unknown>;
      if (r.status !== 'skipped') {
        console.log(
          `[domain-verification] Job ${job.id} completed: ${r.status} for ${r.domain || 'unknown'}`,
        );
      }
    }
  });

  worker.on('failed', (job, err) => {
    console.error(`[domain-verification] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
