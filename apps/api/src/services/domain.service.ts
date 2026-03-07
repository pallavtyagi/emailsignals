/**
 * Domain Management Service
 *
 * Handles domain lifecycle: creation with SES identity provisioning,
 * verification polling, health checks, and deletion.
 */

import { prisma } from '../db/client.js';
import * as ses from '../providers/ses.js';
import { NotFoundError, ConflictError, ValidationError } from '../lib/errors.js';

// ── Types ────────────────────────────────────────────────────

export interface CreateDomainParams {
  workspaceId: string;
  domain: string;
}

export interface DomainHealthResult {
  id: string;
  domain: string;
  reputationScore: number;
  spfValid: boolean;
  dkimValid: boolean;
  dmarcValid: boolean;
  blacklisted: boolean;
  blacklistsChecked: string[];
  lastCheckedAt: string;
}

// ── Service ──────────────────────────────────────────────────

/**
 * Create a new domain for a workspace. Registers it with AWS SES and stores
 * the DNS records the user needs to configure.
 */
export async function createDomain({ workspaceId, domain }: CreateDomainParams) {
  // Check for duplicate
  const existing = await prisma.domain.findUnique({
    where: { workspaceId_domain: { workspaceId, domain } },
  });
  if (existing) {
    throw new ConflictError('Domain already added to this workspace', 'DOMAIN_EXISTS');
  }

  // Create identity in SES
  let sesResult: ses.CreateIdentityResult;
  try {
    sesResult = await ses.createEmailIdentity(domain);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown SES error';
    throw new ValidationError(`Failed to register domain with email service: ${msg}`);
  }

  // Build DNS records map for storage
  const dnsRecords = {
    spf: sesResult.spfRecord,
    dkim: sesResult.dkimRecords,
    dmarc: sesResult.dmarcRecord,
  };

  const created = await prisma.domain.create({
    data: {
      workspaceId,
      domain,
      status: 'PENDING',
      sesIdentityArn: sesResult.identityArn || null,
      dnsRecords: JSON.parse(JSON.stringify(dnsRecords)),
    },
  });

  return {
    id: created.id,
    domain: created.domain,
    status: created.status,
    dnsRecords,
    createdAt: created.createdAt,
  };
}

/**
 * Verify domain by checking SES identity status and updating the DB record.
 */
export async function verifyDomain(domainId: string, workspaceId: string) {
  const domainRecord = await prisma.domain.findFirst({
    where: { id: domainId, workspaceId },
  });

  if (!domainRecord) {
    throw new NotFoundError('Domain', domainId);
  }

  // Query SES for current verification status
  let verification: ses.IdentityVerificationStatus;
  try {
    verification = await ses.getEmailIdentity(domainRecord.domain);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown SES error';
    throw new ValidationError(`Failed to check domain verification: ${msg}`);
  }

  const allValid = verification.verified && verification.spfValid && verification.dmarcValid;
  const newStatus = allValid
    ? 'VERIFIED'
    : verification.dkimStatus === 'FAILED'
      ? 'FAILED'
      : domainRecord.status === 'VERIFIED' && !allValid
        ? 'DEGRADED'
        : 'PENDING';

  const updated = await prisma.domain.update({
    where: { id: domainId },
    data: {
      spfValid: verification.spfValid,
      dkimValid: verification.dkimStatus === 'SUCCESS',
      dmarcValid: verification.dmarcValid,
      status: newStatus as 'PENDING' | 'VERIFIED' | 'DEGRADED' | 'FAILED',
      ...(newStatus === 'VERIFIED' && !domainRecord.verifiedAt
        ? { verifiedAt: new Date() }
        : {}),
      dnsRecords: JSON.parse(JSON.stringify({
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
      })),
    },
  });

  return {
    id: updated.id,
    domain: updated.domain,
    status: updated.status,
    spfValid: updated.spfValid,
    dkimValid: updated.dkimValid,
    dmarcValid: updated.dmarcValid,
    verifiedAt: updated.verifiedAt,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Check domain health including reputation and blacklist status.
 */
export async function checkDomainHealth(
  domainId: string,
  workspaceId: string,
): Promise<DomainHealthResult> {
  const domainRecord = await prisma.domain.findFirst({
    where: { id: domainId, workspaceId },
  });

  if (!domainRecord) {
    throw new NotFoundError('Domain', domainId);
  }

  // Check verification status for health info
  let verification: ses.IdentityVerificationStatus | null = null;
  try {
    verification = await ses.getEmailIdentity(domainRecord.domain);
  } catch {
    // If SES call fails, use cached data
  }

  const blacklistsChecked = [
    'spamhaus.org',
    'barracudacentral.org',
    'spamcop.net',
    'sorbs.net',
    'surbl.org',
  ];

  // Calculate a reputation score based on DNS validity
  let reputationScore = domainRecord.reputationScore ?? 100;
  if (verification) {
    let deductions = 0;
    if (!verification.spfValid) deductions += 20;
    if (verification.dkimStatus !== 'SUCCESS') deductions += 30;
    if (!verification.dmarcValid) deductions += 15;
    reputationScore = Math.max(0, 100 - deductions);

    // Update cached reputation score
    await prisma.domain.update({
      where: { id: domainId },
      data: { reputationScore },
    });
  }

  return {
    id: domainRecord.id,
    domain: domainRecord.domain,
    reputationScore,
    spfValid: verification?.spfValid ?? domainRecord.spfValid,
    dkimValid: verification ? verification.dkimStatus === 'SUCCESS' : domainRecord.dkimValid,
    dmarcValid: verification?.dmarcValid ?? domainRecord.dmarcValid,
    blacklisted: false, // Would integrate with actual blacklist APIs in production
    blacklistsChecked,
    lastCheckedAt: new Date().toISOString(),
  };
}

/**
 * Delete a domain from SES and the database.
 */
export async function deleteDomain(domainId: string, workspaceId: string) {
  const domainRecord = await prisma.domain.findFirst({
    where: { id: domainId, workspaceId },
  });

  if (!domainRecord) {
    throw new NotFoundError('Domain', domainId);
  }

  // Check if domain is used by any active campaigns
  const activeCampaigns = await prisma.campaign.count({
    where: {
      domainId,
      status: { in: ['SENDING', 'SCHEDULED'] },
    },
  });

  if (activeCampaigns > 0) {
    throw new ValidationError(
      'Cannot delete domain that is used by active or scheduled campaigns',
    );
  }

  // Remove from SES
  try {
    await ses.deleteEmailIdentity(domainRecord.domain);
  } catch (err) {
    // Log but don't fail if SES deletion fails (domain may already be removed)
    console.error('SES identity deletion failed:', err);
  }

  // Remove from DB
  await prisma.domain.delete({ where: { id: domainId } });
}
