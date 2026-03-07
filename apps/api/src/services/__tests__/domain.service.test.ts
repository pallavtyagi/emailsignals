import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../db/client.js';
import * as ses from '../../providers/ses.js';
import {
  createDomain,
  verifyDomain,
  checkDomainHealth,
  deleteDomain,
} from '../domain.service.js';
import { createMockDomain } from '../../__tests__/helpers.js';

const mockPrisma = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
const mockSes = ses as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── createDomain ────────────────────────────────────────────

describe('createDomain', () => {
  it('should create a domain and register with SES', async () => {
    mockPrisma.domain.findUnique.mockResolvedValue(null);
    mockSes.createEmailIdentity.mockResolvedValue({
      identityArn: 'arn:aws:ses:us-east-1:123:identity/test.com',
      dkimRecords: [{ type: 'CNAME', name: 'dkim1', value: 'dkim1.test.com', purpose: 'dkim' }],
      spfRecord: { type: 'TXT', name: 'test.com', value: 'v=spf1', purpose: 'spf' },
      dmarcRecord: { type: 'TXT', name: '_dmarc.test.com', value: 'v=DMARC1', purpose: 'dmarc' },
    });
    mockPrisma.domain.create.mockResolvedValue(
      createMockDomain({ id: 'dom_new', domain: 'test.com', status: 'PENDING' }),
    );

    const result = await createDomain({
      workspaceId: 'ws_test123',
      domain: 'test.com',
    });

    expect(result.domain).toBe('test.com');
    expect(result.status).toBe('PENDING');
    expect(mockSes.createEmailIdentity).toHaveBeenCalledWith('test.com');
  });

  it('should throw ConflictError when domain already exists', async () => {
    mockPrisma.domain.findUnique.mockResolvedValue(createMockDomain());

    await expect(
      createDomain({ workspaceId: 'ws_test123', domain: 'example.com' }),
    ).rejects.toThrow(/already added/i);
  });

  it('should throw ValidationError when SES call fails', async () => {
    mockPrisma.domain.findUnique.mockResolvedValue(null);
    mockSes.createEmailIdentity.mockRejectedValue(new Error('SES limit reached'));

    await expect(
      createDomain({ workspaceId: 'ws_test123', domain: 'test.com' }),
    ).rejects.toThrow(/Failed to register/i);
  });
});

// ── verifyDomain ────────────────────────────────────────────

describe('verifyDomain', () => {
  it('should update domain to VERIFIED when all checks pass', async () => {
    mockPrisma.domain.findFirst.mockResolvedValue(
      createMockDomain({ status: 'PENDING', verifiedAt: null }),
    );
    mockSes.getEmailIdentity.mockResolvedValue({
      verified: true,
      spfValid: true,
      dmarcValid: true,
      dkimStatus: 'SUCCESS',
      dkimRecords: [],
    });
    mockPrisma.domain.update.mockResolvedValue(
      createMockDomain({ status: 'VERIFIED' }),
    );

    const result = await verifyDomain('dom_test123', 'ws_test123');
    expect(result.status).toBe('VERIFIED');
  });

  it('should set FAILED when dkimStatus is FAILED', async () => {
    mockPrisma.domain.findFirst.mockResolvedValue(
      createMockDomain({ status: 'PENDING' }),
    );
    mockSes.getEmailIdentity.mockResolvedValue({
      verified: false,
      spfValid: false,
      dmarcValid: false,
      dkimStatus: 'FAILED',
      dkimRecords: [],
    });
    mockPrisma.domain.update.mockResolvedValue(
      createMockDomain({ status: 'FAILED' }),
    );

    const result = await verifyDomain('dom_test123', 'ws_test123');
    expect(result.status).toBe('FAILED');
  });

  it('should throw NotFoundError when domain not found', async () => {
    mockPrisma.domain.findFirst.mockResolvedValue(null);

    await expect(
      verifyDomain('nonexistent', 'ws_test123'),
    ).rejects.toThrow(/not found/i);
  });
});

// ── deleteDomain ────────────────────────────────────────────

describe('deleteDomain', () => {
  it('should delete domain from SES and DB', async () => {
    mockPrisma.domain.findFirst.mockResolvedValue(createMockDomain());
    mockPrisma.campaign.count.mockResolvedValue(0);
    mockSes.deleteEmailIdentity.mockResolvedValue(undefined);
    mockPrisma.domain.delete.mockResolvedValue(createMockDomain());

    await deleteDomain('dom_test123', 'ws_test123');

    expect(mockSes.deleteEmailIdentity).toHaveBeenCalledWith('example.com');
    expect(mockPrisma.domain.delete).toHaveBeenCalledWith({
      where: { id: 'dom_test123' },
    });
  });

  it('should throw when domain has active campaigns', async () => {
    mockPrisma.domain.findFirst.mockResolvedValue(createMockDomain());
    mockPrisma.campaign.count.mockResolvedValue(2);

    await expect(
      deleteDomain('dom_test123', 'ws_test123'),
    ).rejects.toThrow(/active or scheduled campaigns/i);
  });

  it('should throw NotFoundError when domain not found', async () => {
    mockPrisma.domain.findFirst.mockResolvedValue(null);

    await expect(
      deleteDomain('nonexistent', 'ws_test123'),
    ).rejects.toThrow(/not found/i);
  });

  it('should still delete from DB if SES deletion fails', async () => {
    mockPrisma.domain.findFirst.mockResolvedValue(createMockDomain());
    mockPrisma.campaign.count.mockResolvedValue(0);
    mockSes.deleteEmailIdentity.mockRejectedValue(new Error('SES error'));
    mockPrisma.domain.delete.mockResolvedValue(createMockDomain());

    // Should not throw
    await deleteDomain('dom_test123', 'ws_test123');
    expect(mockPrisma.domain.delete).toHaveBeenCalledOnce();
  });
});

// ── checkDomainHealth ───────────────────────────────────────

describe('checkDomainHealth', () => {
  it('should return health with full reputation when all valid', async () => {
    mockPrisma.domain.findFirst.mockResolvedValue(createMockDomain());
    mockSes.getEmailIdentity.mockResolvedValue({
      verified: true,
      spfValid: true,
      dmarcValid: true,
      dkimStatus: 'SUCCESS',
      dkimRecords: [],
    });
    mockPrisma.domain.update.mockResolvedValue(createMockDomain());

    const result = await checkDomainHealth('dom_test123', 'ws_test123');
    expect(result.reputationScore).toBe(100);
    expect(result.spfValid).toBe(true);
    expect(result.dkimValid).toBe(true);
    expect(result.dmarcValid).toBe(true);
    expect(result.blacklisted).toBe(false);
  });

  it('should deduct reputation for invalid DNS records', async () => {
    mockPrisma.domain.findFirst.mockResolvedValue(createMockDomain());
    mockSes.getEmailIdentity.mockResolvedValue({
      verified: true,
      spfValid: false,
      dmarcValid: false,
      dkimStatus: 'PENDING',
      dkimRecords: [],
    });
    mockPrisma.domain.update.mockResolvedValue(createMockDomain());

    const result = await checkDomainHealth('dom_test123', 'ws_test123');
    // -20 (spf) -30 (dkim) -15 (dmarc) = 35
    expect(result.reputationScore).toBe(35);
  });
});
