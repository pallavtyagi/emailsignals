import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../db/client.js';
import {
  checkUsageLimit,
  calculateOverage,
  getUsageSummary,
} from '../billing.service.js';
import { createMockSubscription } from '../../__tests__/helpers.js';

const mockPrisma = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── checkUsageLimit ─────────────────────────────────────────

describe('checkUsageLimit', () => {
  it('should return allowed when subscription is active', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(
      createMockSubscription({ status: 'ACTIVE', emailsUsed: 1000, emailsLimit: 50000 }),
    );

    const result = await checkUsageLimit('ws_test123');
    expect(result.allowed).toBe(true);
    expect(result.emailsUsed).toBe(1000);
    expect(result.emailsLimit).toBe(50000);
  });

  it('should return not allowed when no subscription exists', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    const result = await checkUsageLimit('ws_test123');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('No active subscription');
  });

  it('should return not allowed when subscription is cancelled', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(
      createMockSubscription({ status: 'CANCELLED' }),
    );

    const result = await checkUsageLimit('ws_test123');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Subscription is cancelled');
  });

  it('should return not allowed when subscription is past due', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(
      createMockSubscription({ status: 'PAST_DUE' }),
    );

    const result = await checkUsageLimit('ws_test123');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Subscription payment is past due');
  });

  it('should allow sending even when over limit (overage billing)', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(
      createMockSubscription({
        status: 'ACTIVE',
        emailsUsed: 60000,
        emailsLimit: 50000,
      }),
    );

    const result = await checkUsageLimit('ws_test123');
    expect(result.allowed).toBe(true);
  });
});

// ── calculateOverage ────────────────────────────────────────

describe('calculateOverage', () => {
  it('should return zero overage when under limit', () => {
    const result = calculateOverage(5000, 50000);
    expect(result.overage).toBe(0);
    expect(result.overageCost).toBe(0);
    expect(result.overageCostFormatted).toBe('$0.00');
  });

  it('should calculate overage cost correctly', () => {
    // 10000 over limit => 10 * $1.00 = $10.00
    const result = calculateOverage(60000, 50000);
    expect(result.overage).toBe(10000);
    expect(result.overageCost).toBe(1000); // 10 * 100 cents
    expect(result.overageCostFormatted).toBe('$10.00');
  });

  it('should round up to next 1000 for overage cost', () => {
    // 500 over limit => ceil(500/1000) = 1 => $1.00
    const result = calculateOverage(50500, 50000);
    expect(result.overage).toBe(500);
    expect(result.overageCost).toBe(100); // 1 * 100 cents
    expect(result.overageCostFormatted).toBe('$1.00');
  });

  it('should handle exactly at limit', () => {
    const result = calculateOverage(50000, 50000);
    expect(result.overage).toBe(0);
    expect(result.overageCost).toBe(0);
  });
});

// ── getUsageSummary ─────────────────────────────────────────

describe('getUsageSummary', () => {
  it('should return usage summary with overage', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(
      createMockSubscription({
        emailsUsed: 55000,
        emailsLimit: 50000,
      }),
    );

    const result = await getUsageSummary('ws_test123');
    expect(result.plan).toBe('GROWTH');
    expect(result.emailsUsed).toBe(55000);
    expect(result.emailsLimit).toBe(50000);
    expect(result.usagePercent).toBe(110);
    expect(result.overage).toBe(5000);
  });

  it('should throw NotFoundError when no subscription', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    await expect(getUsageSummary('ws_test123')).rejects.toThrow(/not found/i);
  });

  it('should return 0% usage when limit is 0', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(
      createMockSubscription({ emailsUsed: 0, emailsLimit: 0 }),
    );

    const result = await getUsageSummary('ws_test123');
    expect(result.usagePercent).toBe(0);
  });
});
