import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';

export async function analyticsRoutes(app: FastifyInstance) {
  // GET /v1/analytics/overview
  app.get('/overview', async (request) => {
    const { workspaceId } = request.auth;
    const { from, to } = request.query as { from?: string; to?: string };

    const dateFilter = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };

    const events = await prisma.emailEvent.groupBy({
      by: ['eventType'],
      where: {
        workspaceId,
        ...(from || to ? { occurredAt: dateFilter } : {}),
      },
      _count: true,
    });

    const eventCounts: Record<string, number> = {};
    for (const e of events) {
      eventCounts[e.eventType] = e._count;
    }

    const totalSent =
      (eventCounts['DELIVERED'] ?? 0) +
      (eventCounts['BOUNCED_HARD'] ?? 0) +
      (eventCounts['BOUNCED_SOFT'] ?? 0) +
      (eventCounts['FAILED'] ?? 0);
    const totalDelivered = eventCounts['DELIVERED'] ?? 0;

    // Build time series data
    const timeSeriesRaw = await prisma.emailEvent.groupBy({
      by: ['eventType'],
      where: {
        workspaceId,
        ...(from || to ? { occurredAt: dateFilter } : {}),
        eventType: { in: ['DELIVERED', 'OPENED', 'CLICKED'] },
      },
      _count: true,
    });

    // Aggregate per-day time series if dates are provided
    let timeSeries: Array<{ date: string; sent: number; opens: number; clicks: number }> = [];

    if (from || to) {
      const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = to ? new Date(to) : new Date();

      // Get daily event counts
      const dailyEvents = await prisma.$queryRawUnsafe<
        Array<{ day: Date; event_type: string; count: bigint }>
      >(
        `SELECT DATE_TRUNC('day', occurred_at) as day, event_type, COUNT(*) as count
         FROM email_events
         WHERE workspace_id = $1
           AND occurred_at >= $2
           AND occurred_at <= $3
           AND event_type IN ('DELIVERED', 'OPENED', 'CLICKED')
         GROUP BY day, event_type
         ORDER BY day ASC`,
        workspaceId,
        startDate,
        endDate,
      );

      const dayMap = new Map<string, { sent: number; opens: number; clicks: number }>();
      for (const row of dailyEvents) {
        const dateStr = new Date(row.day).toISOString().split('T')[0];
        if (!dayMap.has(dateStr)) {
          dayMap.set(dateStr, { sent: 0, opens: 0, clicks: 0 });
        }
        const entry = dayMap.get(dateStr)!;
        const count = Number(row.count);
        switch (row.event_type) {
          case 'DELIVERED':
            entry.sent = count;
            break;
          case 'OPENED':
            entry.opens = count;
            break;
          case 'CLICKED':
            entry.clicks = count;
            break;
        }
      }

      timeSeries = Array.from(dayMap.entries()).map(([date, data]) => ({
        date,
        ...data,
      }));
    }

    return {
      totalSent,
      totalDelivered,
      avgOpenRate:
        totalDelivered > 0
          ? ((eventCounts['OPENED'] ?? 0) / totalDelivered) * 100
          : 0,
      avgClickRate:
        totalDelivered > 0
          ? ((eventCounts['CLICKED'] ?? 0) / totalDelivered) * 100
          : 0,
      campaignsSent: await prisma.campaign.count({
        where: { workspaceId, status: 'SENT' },
      }),
      timeSeries,
    };
  });

  // GET /v1/analytics/campaigns/:id/stats
  app.get('/campaigns/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });

    if (!campaign) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
    }

    const events = await prisma.emailEvent.groupBy({
      by: ['eventType'],
      where: { campaignId: id },
      _count: true,
    });

    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.eventType] = e._count;
    }

    // Get unique opens and clicks
    const uniqueOpens = await prisma.emailEvent.groupBy({
      by: ['contactId'],
      where: { campaignId: id, eventType: 'OPENED', contactId: { not: null } },
    });

    const uniqueClicks = await prisma.emailEvent.groupBy({
      by: ['contactId'],
      where: { campaignId: id, eventType: 'CLICKED', contactId: { not: null } },
    });

    const sent = campaign.sentCount;
    const delivered = counts['DELIVERED'] ?? 0;

    return {
      campaignId: id,
      sent,
      delivered,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      opens: counts['OPENED'] ?? 0,
      uniqueOpens: uniqueOpens.length,
      openRate:
        delivered > 0 ? (uniqueOpens.length / delivered) * 100 : 0,
      clicks: counts['CLICKED'] ?? 0,
      uniqueClicks: uniqueClicks.length,
      clickRate:
        delivered > 0 ? (uniqueClicks.length / delivered) * 100 : 0,
      bouncedHard: counts['BOUNCED_HARD'] ?? 0,
      bouncedSoft: counts['BOUNCED_SOFT'] ?? 0,
      bounceRate:
        sent > 0
          ? (((counts['BOUNCED_HARD'] ?? 0) + (counts['BOUNCED_SOFT'] ?? 0)) / sent) * 100
          : 0,
      unsubscribes: counts['UNSUBSCRIBED'] ?? 0,
      unsubscribeRate:
        delivered > 0
          ? ((counts['UNSUBSCRIBED'] ?? 0) / delivered) * 100
          : 0,
      complaints: counts['COMPLAINED'] ?? 0,
      complaintRate:
        delivered > 0
          ? ((counts['COMPLAINED'] ?? 0) / delivered) * 100
          : 0,
      failed: counts['FAILED'] ?? 0,
    };
  });

  // GET /v1/analytics/campaigns/:id/events
  app.get('/campaigns/:id/events', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;
    const { limit = '50', after, event_type } = request.query as {
      limit?: string;
      after?: string;
      event_type?: string;
    };

    // Verify campaign belongs to workspace
    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!campaign) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
    }

    const parsedLimit = parseInt(limit, 10);

    const events = await prisma.emailEvent.findMany({
      where: {
        campaignId: id,
        ...(event_type
          ? {
              eventType: event_type.toUpperCase() as Parameters<
                typeof prisma.emailEvent.findMany
              >[0]['where'] extends { eventType?: infer T }
                ? T
                : never,
            }
          : {}),
      },
      take: parsedLimit,
      orderBy: { occurredAt: 'desc' },
      ...(after ? { cursor: { id: after }, skip: 1 } : {}),
    });

    return {
      data: events,
      nextCursor:
        events.length === parsedLimit ? events[events.length - 1]?.id : null,
    };
  });
}
