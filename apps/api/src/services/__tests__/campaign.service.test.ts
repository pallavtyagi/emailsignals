import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../db/client.js';
import { emailSendingQueue, scheduledCampaignsQueue } from '../../queues/index.js';
import {
  createCampaign,
  updateCampaign,
  sendCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  duplicateCampaign,
  getCampaign,
} from '../campaign.service.js';
import {
  createMockCampaign,
  createMockDomain,
  createMockContactList,
} from '../../__tests__/helpers.js';

const mockPrisma = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── createCampaign ──────────────────────────────────────────

describe('createCampaign', () => {
  const validParams = {
    workspaceId: 'ws_test123',
    name: 'Launch Campaign',
    subject: 'We just launched!',
    fromName: 'Acme',
    fromEmail: 'hello@acme.com',
    domainId: 'dom_test123',
    html: '<p>Hello</p>',
    listIds: ['lst_1'],
  };

  it('should create a campaign with valid params', async () => {
    const domain = createMockDomain({ status: 'VERIFIED' });
    mockPrisma.domain.findFirst.mockResolvedValue(domain);
    mockPrisma.contactList.findMany.mockResolvedValue([{ id: 'lst_1' }]);
    mockPrisma.contactListMembership.findMany.mockResolvedValue([]);
    mockPrisma.campaign.create.mockResolvedValue(
      createMockCampaign({ id: 'cmp_new', name: 'Launch Campaign', estimatedRecipients: 0 }),
    );

    const result = await createCampaign(validParams);

    expect(result.id).toBe('cmp_new');
    expect(result.name).toBe('Launch Campaign');
    expect(result.status).toBe('DRAFT');
    expect(mockPrisma.campaign.create).toHaveBeenCalledOnce();
  });

  it('should throw NotFoundError when domain does not exist', async () => {
    mockPrisma.domain.findFirst.mockResolvedValue(null);

    await expect(createCampaign(validParams)).rejects.toThrow(/not found/i);
  });

  it('should throw ValidationError when domain is not verified', async () => {
    const domain = createMockDomain({ status: 'PENDING' });
    mockPrisma.domain.findFirst.mockResolvedValue(domain);

    await expect(createCampaign(validParams)).rejects.toThrow(/verified/i);
  });

  it('should throw ValidationError when contact lists not found', async () => {
    const domain = createMockDomain({ status: 'VERIFIED' });
    mockPrisma.domain.findFirst.mockResolvedValue(domain);
    mockPrisma.contactList.findMany.mockResolvedValue([]); // none found

    await expect(createCampaign(validParams)).rejects.toThrow(/contact lists/i);
  });

  it('should throw ValidationError when exclusion lists not found', async () => {
    const domain = createMockDomain({ status: 'VERIFIED' });
    mockPrisma.domain.findFirst.mockResolvedValue(domain);
    mockPrisma.contactList.findMany
      .mockResolvedValueOnce([{ id: 'lst_1' }]) // included lists OK
      .mockResolvedValueOnce([]); // exclusion lists not found

    await expect(
      createCampaign({ ...validParams, exclusionListIds: ['lst_excl_1'] }),
    ).rejects.toThrow(/exclusion lists/i);
  });

  it('should throw ValidationError when no HTML and no templateId', async () => {
    const domain = createMockDomain({ status: 'VERIFIED' });
    mockPrisma.domain.findFirst.mockResolvedValue(domain);
    mockPrisma.contactList.findMany.mockResolvedValue([{ id: 'lst_1' }]);

    const params = { ...validParams, html: undefined, templateId: undefined };
    await expect(createCampaign(params as any)).rejects.toThrow(/HTML content or a template/i);
  });

  it('should throw NotFoundError when template not found', async () => {
    const domain = createMockDomain({ status: 'VERIFIED' });
    mockPrisma.domain.findFirst.mockResolvedValue(domain);
    mockPrisma.contactList.findMany.mockResolvedValue([{ id: 'lst_1' }]);
    mockPrisma.template.findFirst.mockResolvedValue(null);

    await expect(
      createCampaign({ ...validParams, html: undefined, templateId: 'tpl_nonexistent' }),
    ).rejects.toThrow(/not found/i);
  });
});

// ── State Transitions ───────────────────────────────────────

describe('sendCampaign', () => {
  it('should transition DRAFT to SENDING', async () => {
    const campaign = createMockCampaign({
      status: 'DRAFT',
      domain: createMockDomain({ status: 'VERIFIED' }),
      lists: [{ listId: 'lst_1' }],
    });
    mockPrisma.campaign.findFirst.mockResolvedValue(campaign);
    mockPrisma.campaignExclusion.findMany.mockResolvedValue([]);
    mockPrisma.contactListMembership.findMany.mockResolvedValue([
      { contactId: 'ct_1' },
    ]);
    mockPrisma.contact.findMany.mockResolvedValue([
      { id: 'ct_1', email: 'a@test.com' },
    ]);
    mockPrisma.suppression.findMany.mockResolvedValue([]);
    mockPrisma.campaign.update.mockResolvedValue(
      createMockCampaign({ status: 'SENDING', estimatedRecipients: 1 }),
    );

    const result = await sendCampaign('cmp_test123', 'ws_test123');

    expect(result.status).toBe('SENDING');
    expect(emailSendingQueue.add).toHaveBeenCalledOnce();
  });

  it('should transition DRAFT to SCHEDULED when sendAt is provided', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const campaign = createMockCampaign({
      status: 'DRAFT',
      domain: createMockDomain({ status: 'VERIFIED' }),
      lists: [{ listId: 'lst_1' }],
    });
    mockPrisma.campaign.findFirst.mockResolvedValue(campaign);
    mockPrisma.campaignExclusion.findMany.mockResolvedValue([]);
    mockPrisma.contactListMembership.findMany.mockResolvedValue([
      { contactId: 'ct_1' },
    ]);
    mockPrisma.contact.findMany.mockResolvedValue([
      { id: 'ct_1', email: 'a@test.com' },
    ]);
    mockPrisma.suppression.findMany.mockResolvedValue([]);
    mockPrisma.campaign.update.mockResolvedValue(
      createMockCampaign({ status: 'SCHEDULED', scheduledAt: new Date(futureDate) }),
    );

    const result = await sendCampaign('cmp_test123', 'ws_test123', {
      sendAt: futureDate,
    });

    expect(result.status).toBe('SCHEDULED');
    expect(scheduledCampaignsQueue.add).toHaveBeenCalledOnce();
  });

  it('should throw when campaign not found', async () => {
    mockPrisma.campaign.findFirst.mockResolvedValue(null);

    await expect(
      sendCampaign('nonexistent', 'ws_test123'),
    ).rejects.toThrow(/not found/i);
  });

  it('should throw on invalid state transition (SENT to SENDING)', async () => {
    const campaign = createMockCampaign({
      status: 'SENT',
      domain: createMockDomain({ status: 'VERIFIED' }),
      lists: [],
    });
    mockPrisma.campaign.findFirst.mockResolvedValue(campaign);

    await expect(
      sendCampaign('cmp_test123', 'ws_test123'),
    ).rejects.toThrow(/Cannot transition/i);
  });

  it('should throw when domain is no longer verified', async () => {
    const campaign = createMockCampaign({
      status: 'DRAFT',
      domain: createMockDomain({ status: 'DEGRADED' }),
      lists: [],
    });
    mockPrisma.campaign.findFirst.mockResolvedValue(campaign);

    await expect(
      sendCampaign('cmp_test123', 'ws_test123'),
    ).rejects.toThrow(/no longer verified/i);
  });

  it('should throw when no recipients found', async () => {
    const campaign = createMockCampaign({
      status: 'DRAFT',
      domain: createMockDomain({ status: 'VERIFIED' }),
      lists: [{ listId: 'lst_1' }],
    });
    mockPrisma.campaign.findFirst.mockResolvedValue(campaign);
    mockPrisma.campaignExclusion.findMany.mockResolvedValue([]);
    mockPrisma.contactListMembership.findMany.mockResolvedValue([]);

    await expect(
      sendCampaign('cmp_test123', 'ws_test123'),
    ).rejects.toThrow(/No recipients/i);
  });
});

describe('pauseCampaign', () => {
  it('should transition SENDING to PAUSED', async () => {
    const campaign = createMockCampaign({ status: 'SENDING' });
    mockPrisma.campaign.findFirst.mockResolvedValue(campaign);
    mockPrisma.campaign.update.mockResolvedValue(
      createMockCampaign({ status: 'PAUSED' }),
    );

    const result = await pauseCampaign('cmp_test123', 'ws_test123');
    expect(result.status).toBe('PAUSED');
  });

  it('should throw on invalid transition (DRAFT to PAUSED)', async () => {
    const campaign = createMockCampaign({ status: 'DRAFT' });
    mockPrisma.campaign.findFirst.mockResolvedValue(campaign);

    await expect(
      pauseCampaign('cmp_test123', 'ws_test123'),
    ).rejects.toThrow(/Cannot transition/i);
  });
});

describe('resumeCampaign', () => {
  it('should transition PAUSED to SENDING', async () => {
    const campaign = createMockCampaign({ status: 'PAUSED' });
    mockPrisma.campaign.findFirst.mockResolvedValue(campaign);
    mockPrisma.campaign.update.mockResolvedValue(
      createMockCampaign({ status: 'SENDING' }),
    );

    const result = await resumeCampaign('cmp_test123', 'ws_test123');
    expect(result.status).toBe('SENDING');
    expect(emailSendingQueue.add).toHaveBeenCalledOnce();
  });
});

describe('cancelCampaign', () => {
  it('should transition SENDING to CANCELLED', async () => {
    const campaign = createMockCampaign({ status: 'SENDING' });
    mockPrisma.campaign.findFirst.mockResolvedValue(campaign);
    mockPrisma.sendJob.updateMany.mockResolvedValue({ count: 5 });
    mockPrisma.campaign.update.mockResolvedValue(
      createMockCampaign({ status: 'CANCELLED' }),
    );

    const result = await cancelCampaign('cmp_test123', 'ws_test123');
    expect(result.status).toBe('CANCELLED');
    expect(mockPrisma.sendJob.updateMany).toHaveBeenCalledWith({
      where: { campaignId: 'cmp_test123', status: 'QUEUED' },
      data: { status: 'SKIPPED' },
    });
  });

  it('should throw on invalid transition (SENT to CANCELLED)', async () => {
    const campaign = createMockCampaign({ status: 'SENT' });
    mockPrisma.campaign.findFirst.mockResolvedValue(campaign);

    await expect(
      cancelCampaign('cmp_test123', 'ws_test123'),
    ).rejects.toThrow(/Cannot transition/i);
  });
});

// ── duplicateCampaign ───────────────────────────────────────

describe('duplicateCampaign', () => {
  it('should create a copy of the campaign', async () => {
    const original = createMockCampaign({
      name: 'Original',
      lists: [{ listId: 'lst_1' }],
      exclusions: [],
    });
    mockPrisma.campaign.findFirst.mockResolvedValue(original);
    mockPrisma.campaign.create.mockResolvedValue(
      createMockCampaign({ id: 'cmp_copy', name: 'Original (Copy)', status: 'DRAFT' }),
    );

    const result = await duplicateCampaign('cmp_test123', 'ws_test123');
    expect(result.name).toBe('Original (Copy)');
    expect(result.status).toBe('DRAFT');
  });

  it('should throw NotFoundError when campaign not found', async () => {
    mockPrisma.campaign.findFirst.mockResolvedValue(null);

    await expect(
      duplicateCampaign('nonexistent', 'ws_test123'),
    ).rejects.toThrow(/not found/i);
  });
});

// ── updateCampaign ──────────────────────────────────────────

describe('updateCampaign', () => {
  it('should update a draft campaign', async () => {
    const campaign = createMockCampaign({ status: 'DRAFT' });
    mockPrisma.campaign.findFirst.mockResolvedValue(campaign);
    mockPrisma.campaign.update.mockResolvedValue(
      createMockCampaign({ subject: 'Updated Subject' }),
    );

    const result = await updateCampaign('cmp_test123', 'ws_test123', {
      subject: 'Updated Subject',
    });
    expect(result.subject).toBe('Updated Subject');
  });

  it('should throw when updating a SENT campaign', async () => {
    const campaign = createMockCampaign({ status: 'SENT' });
    mockPrisma.campaign.findFirst.mockResolvedValue(campaign);

    await expect(
      updateCampaign('cmp_test123', 'ws_test123', { subject: 'Nope' }),
    ).rejects.toThrow(/draft or scheduled/i);
  });
});

// ── getCampaign ─────────────────────────────────────────────

describe('getCampaign', () => {
  it('should return campaign with related data', async () => {
    const campaign = createMockCampaign({
      domain: createMockDomain(),
      template: null,
      lists: [],
      exclusions: [],
    });
    mockPrisma.campaign.findFirst.mockResolvedValue(campaign);

    const result = await getCampaign('cmp_test123', 'ws_test123');
    expect(result.id).toBe('cmp_test123');
  });

  it('should throw NotFoundError when not found', async () => {
    mockPrisma.campaign.findFirst.mockResolvedValue(null);

    await expect(
      getCampaign('nonexistent', 'ws_test123'),
    ).rejects.toThrow(/not found/i);
  });
});
