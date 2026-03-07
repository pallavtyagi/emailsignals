import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../db/client.js';
import { processSesEvent, confirmSnsSubscription } from '../event.service.js';

const mockPrisma = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>> & {
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// Helper to create an SNS notification wrapping an SES event
function createSnsNotification(sesEvent: Record<string, unknown>) {
  return {
    Type: 'Notification',
    Message: JSON.stringify(sesEvent),
  };
}

// ── SNS Subscription Confirmation ───────────────────────────

describe('confirmSnsSubscription', () => {
  it('should fetch the SubscribeURL', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response());

    await confirmSnsSubscription('https://sns.example.com/confirm');

    expect(fetchSpy).toHaveBeenCalledWith('https://sns.example.com/confirm');
    fetchSpy.mockRestore();
  });
});

// ── processSesEvent ─────────────────────────────────────────

describe('processSesEvent', () => {
  it('should handle SubscriptionConfirmation', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response());

    const result = await processSesEvent({
      Type: 'SubscriptionConfirmation',
      SubscribeURL: 'https://sns.example.com/confirm',
    });

    expect(result.processed).toBe(true);
    expect(result.eventType).toBe('SubscriptionConfirmation');
    fetchSpy.mockRestore();
  });

  it('should return not processed for non-Notification types', async () => {
    const result = await processSesEvent({
      Type: 'UnknownType',
    });

    expect(result.processed).toBe(false);
  });

  it('should return not processed when Message is missing', async () => {
    const result = await processSesEvent({
      Type: 'Notification',
    });

    expect(result.processed).toBe(false);
  });

  it('should return not processed when no workspace_id tag', async () => {
    const result = await processSesEvent(
      createSnsNotification({
        eventType: 'Delivery',
        mail: { tags: {}, destination: ['a@test.com'] },
        delivery: { recipients: ['a@test.com'] },
      }),
    );

    expect(result.processed).toBe(false);
  });
});

// ── Delivery Events ─────────────────────────────────────────

describe('delivery events', () => {
  it('should create DELIVERED email event', async () => {
    mockPrisma.emailEvent.create.mockResolvedValue({});

    const result = await processSesEvent(
      createSnsNotification({
        eventType: 'Delivery',
        mail: {
          messageId: 'msg_1',
          tags: {
            workspace_id: ['ws_test123'],
            campaign_id: ['cmp_1'],
            contact_id: ['ct_1'],
          },
          destination: ['user@test.com'],
        },
        delivery: {
          timestamp: '2025-01-01T00:00:00Z',
          recipients: ['user@test.com'],
        },
      }),
    );

    expect(result.processed).toBe(true);
    expect(result.eventType).toBe('Delivery');
    expect(mockPrisma.emailEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'DELIVERED',
          email: 'user@test.com',
          workspaceId: 'ws_test123',
        }),
      }),
    );
  });
});

// ── Bounce Events ───────────────────────────────────────────

describe('bounce events', () => {
  it('should create BOUNCED_HARD event for permanent bounce', async () => {
    mockPrisma.emailEvent.create.mockResolvedValue({});
    // $transaction mock executes the callback
    mockPrisma.$transaction.mockImplementation((fn: (tx: any) => any) => {
      const tx = {
        suppression: { upsert: vi.fn().mockResolvedValue({}) },
        contact: { updateMany: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const result = await processSesEvent(
      createSnsNotification({
        eventType: 'Bounce',
        mail: {
          messageId: 'msg_2',
          tags: {
            workspace_id: ['ws_test123'],
            campaign_id: ['cmp_1'],
          },
          destination: ['bounced@test.com'],
        },
        bounce: {
          bounceType: 'Permanent',
          bounceSubType: 'General',
          bouncedRecipients: [
            { emailAddress: 'bounced@test.com', status: '550', diagnosticCode: 'User unknown' },
          ],
          timestamp: '2025-01-01T00:00:00Z',
        },
      }),
    );

    expect(result.processed).toBe(true);
    expect(mockPrisma.emailEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'BOUNCED_HARD',
        }),
      }),
    );
    // Should auto-suppress
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it('should create BOUNCED_SOFT event for transient bounce without suppression', async () => {
    mockPrisma.emailEvent.create.mockResolvedValue({});

    await processSesEvent(
      createSnsNotification({
        eventType: 'Bounce',
        mail: {
          tags: { workspace_id: ['ws_test123'] },
          destination: ['soft@test.com'],
        },
        bounce: {
          bounceType: 'Transient',
          bouncedRecipients: [{ emailAddress: 'soft@test.com' }],
        },
      }),
    );

    expect(mockPrisma.emailEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'BOUNCED_SOFT',
        }),
      }),
    );
    // Should NOT auto-suppress soft bounces
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ── Complaint Events ────────────────────────────────────────

describe('complaint events', () => {
  it('should create COMPLAINED event and auto-suppress', async () => {
    mockPrisma.emailEvent.create.mockResolvedValue({});
    mockPrisma.$transaction.mockImplementation((fn: (tx: any) => any) => {
      const tx = {
        suppression: { upsert: vi.fn().mockResolvedValue({}) },
        contact: { updateMany: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const result = await processSesEvent(
      createSnsNotification({
        eventType: 'Complaint',
        mail: {
          tags: {
            workspace_id: ['ws_test123'],
            campaign_id: ['cmp_1'],
          },
          destination: ['complainer@test.com'],
        },
        complaint: {
          complainedRecipients: [{ emailAddress: 'complainer@test.com' }],
          complaintFeedbackType: 'abuse',
        },
      }),
    );

    expect(result.processed).toBe(true);
    expect(mockPrisma.emailEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'COMPLAINED',
        }),
      }),
    );
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });
});

// ── Open Events ─────────────────────────────────────────────

describe('open events', () => {
  it('should create OPENED email event', async () => {
    mockPrisma.emailEvent.create.mockResolvedValue({});

    await processSesEvent(
      createSnsNotification({
        eventType: 'Open',
        mail: {
          tags: {
            workspace_id: ['ws_test123'],
            campaign_id: ['cmp_1'],
            contact_id: ['ct_1'],
          },
          destination: ['user@test.com'],
        },
        open: {
          timestamp: '2025-01-01T00:00:00Z',
          ipAddress: '1.2.3.4',
          userAgent: 'Mozilla/5.0',
        },
      }),
    );

    expect(mockPrisma.emailEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'OPENED',
          email: 'user@test.com',
        }),
      }),
    );
  });
});

// ── Click Events ────────────────────────────────────────────

describe('click events', () => {
  it('should create CLICKED email event with link', async () => {
    mockPrisma.emailEvent.create.mockResolvedValue({});

    await processSesEvent(
      createSnsNotification({
        eventType: 'Click',
        mail: {
          tags: {
            workspace_id: ['ws_test123'],
            campaign_id: ['cmp_1'],
            contact_id: ['ct_1'],
          },
          destination: ['user@test.com'],
        },
        click: {
          timestamp: '2025-01-01T00:00:00Z',
          link: 'https://example.com/promo',
          ipAddress: '1.2.3.4',
        },
      }),
    );

    expect(mockPrisma.emailEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'CLICKED',
          metadata: expect.objectContaining({
            linkUrl: 'https://example.com/promo',
          }),
        }),
      }),
    );
  });
});

// ── Unknown event types ─────────────────────────────────────

describe('unknown events', () => {
  it('should return not processed for unknown event types', async () => {
    const result = await processSesEvent(
      createSnsNotification({
        eventType: 'Send',
        mail: {
          tags: { workspace_id: ['ws_test123'] },
          destination: ['user@test.com'],
        },
      }),
    );

    expect(result.processed).toBe(false);
  });
});
