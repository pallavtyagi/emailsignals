/**
 * SES Event Webhook Processor
 *
 * Processes incoming SES events delivered via SNS:
 * - Parses SNS notification (handles SubscriptionConfirmation)
 * - Maps SES event types (Delivery, Bounce, Complaint, Open, Click) to our EmailEvent model
 * - Stores events in the email_events table
 * - Auto-suppresses hard bounces and complaints
 * - Updates campaign statistics
 */

import { prisma } from '../db/client.js';

// ── Types ────────────────────────────────────────────────────

interface SnsMessage {
  Type: string;
  MessageId?: string;
  SubscribeURL?: string;
  Message?: string;
  TopicArn?: string;
}

interface SesEventMessage {
  eventType?: string;
  notificationType?: string;
  mail?: {
    messageId?: string;
    tags?: Record<string, string[]>;
    commonHeaders?: {
      to?: string[];
      from?: string[];
      subject?: string;
    };
    destination?: string[];
  };
  delivery?: {
    timestamp?: string;
    recipients?: string[];
  };
  bounce?: {
    bounceType?: string;
    bounceSubType?: string;
    bouncedRecipients?: Array<{
      emailAddress?: string;
      status?: string;
      diagnosticCode?: string;
    }>;
    timestamp?: string;
  };
  complaint?: {
    complainedRecipients?: Array<{
      emailAddress?: string;
    }>;
    complaintFeedbackType?: string;
    timestamp?: string;
  };
  open?: {
    timestamp?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  click?: {
    timestamp?: string;
    ipAddress?: string;
    userAgent?: string;
    link?: string;
  };
}

interface ProcessResult {
  processed: boolean;
  eventType?: string;
  recipients?: string[];
}

// ── SNS Subscription Confirmation ────────────────────────────

/**
 * Handle SNS SubscriptionConfirmation by visiting the SubscribeURL.
 */
export async function confirmSnsSubscription(subscribeUrl: string): Promise<void> {
  try {
    await fetch(subscribeUrl);
    console.log('[event-service] SNS subscription confirmed');
  } catch (err) {
    console.error('[event-service] Failed to confirm SNS subscription:', err);
    throw err;
  }
}

// ── SES Event Processing ─────────────────────────────────────

/**
 * Process an incoming SES event from SNS notification.
 */
export async function processSesEvent(body: SnsMessage): Promise<ProcessResult> {
  // Handle SNS subscription confirmation
  if (body.Type === 'SubscriptionConfirmation' && body.SubscribeURL) {
    await confirmSnsSubscription(body.SubscribeURL);
    return { processed: true, eventType: 'SubscriptionConfirmation' };
  }

  // Handle notification
  if (body.Type !== 'Notification' || !body.Message) {
    return { processed: false };
  }

  let message: SesEventMessage;
  try {
    message = typeof body.Message === 'string' ? JSON.parse(body.Message) : body.Message;
  } catch {
    console.error('[event-service] Failed to parse SES event message');
    return { processed: false };
  }

  const eventType = message.eventType || message.notificationType;
  if (!eventType) {
    return { processed: false };
  }

  // Extract campaign and workspace info from SES message tags
  const tags = message.mail?.tags || {};
  const campaignId = tags['campaign_id']?.[0];
  const contactId = tags['contact_id']?.[0];
  const workspaceId = tags['workspace_id']?.[0];

  if (!workspaceId) {
    // Not our email, skip
    return { processed: false };
  }

  // Route to specific handler
  switch (eventType.toLowerCase()) {
    case 'delivery':
      await handleDelivery(message, workspaceId, campaignId, contactId);
      break;
    case 'bounce':
      await handleBounce(message, workspaceId, campaignId, contactId);
      break;
    case 'complaint':
      await handleComplaint(message, workspaceId, campaignId, contactId);
      break;
    case 'open':
      await handleOpen(message, workspaceId, campaignId, contactId);
      break;
    case 'click':
      await handleClick(message, workspaceId, campaignId, contactId);
      break;
    default:
      console.log(`[event-service] Unhandled SES event type: ${eventType}`);
      return { processed: false };
  }

  const recipients = message.mail?.destination || [];
  return { processed: true, eventType, recipients };
}

// ── Event Handlers ───────────────────────────────────────────

async function handleDelivery(
  message: SesEventMessage,
  workspaceId: string,
  campaignId?: string,
  contactId?: string,
) {
  const recipients = message.delivery?.recipients || message.mail?.destination || [];

  for (const email of recipients) {
    await prisma.emailEvent.create({
      data: {
        workspaceId,
        campaignId: campaignId || null,
        contactId: contactId || null,
        email,
        eventType: 'DELIVERED',
        metadata: {
          timestamp: message.delivery?.timestamp,
          sesMessageId: message.mail?.messageId,
        },
        occurredAt: message.delivery?.timestamp
          ? new Date(message.delivery.timestamp)
          : new Date(),
      },
    });
  }
}

async function handleBounce(
  message: SesEventMessage,
  workspaceId: string,
  campaignId?: string,
  contactId?: string,
) {
  const bounceType = message.bounce?.bounceType;
  const isHardBounce = bounceType === 'Permanent';
  const recipients = message.bounce?.bouncedRecipients || [];

  for (const recipient of recipients) {
    const email = recipient.emailAddress;
    if (!email) continue;

    const eventType = isHardBounce ? 'BOUNCED_HARD' : 'BOUNCED_SOFT';

    // Store event
    await prisma.emailEvent.create({
      data: {
        workspaceId,
        campaignId: campaignId || null,
        contactId: contactId || null,
        email,
        eventType,
        metadata: {
          bounceType: message.bounce?.bounceType,
          bounceSubType: message.bounce?.bounceSubType,
          diagnosticCode: recipient.diagnosticCode,
          status: recipient.status,
          sesMessageId: message.mail?.messageId,
        },
        occurredAt: message.bounce?.timestamp
          ? new Date(message.bounce.timestamp)
          : new Date(),
      },
    });

    // Auto-suppress hard bounces
    if (isHardBounce) {
      await autoSuppress(workspaceId, email, 'BOUNCE_HARD', campaignId);
    }
  }
}

async function handleComplaint(
  message: SesEventMessage,
  workspaceId: string,
  campaignId?: string,
  contactId?: string,
) {
  const recipients = message.complaint?.complainedRecipients || [];

  for (const recipient of recipients) {
    const email = recipient.emailAddress;
    if (!email) continue;

    // Store event
    await prisma.emailEvent.create({
      data: {
        workspaceId,
        campaignId: campaignId || null,
        contactId: contactId || null,
        email,
        eventType: 'COMPLAINED',
        metadata: {
          complaintFeedbackType: message.complaint?.complaintFeedbackType,
          sesMessageId: message.mail?.messageId,
        },
        occurredAt: message.complaint?.timestamp
          ? new Date(message.complaint.timestamp)
          : new Date(),
      },
    });

    // Auto-suppress complaints
    await autoSuppress(workspaceId, email, 'COMPLAINT', campaignId);
  }
}

async function handleOpen(
  message: SesEventMessage,
  workspaceId: string,
  campaignId?: string,
  contactId?: string,
) {
  const emails = message.mail?.destination || [];
  const email = emails[0];
  if (!email) return;

  await prisma.emailEvent.create({
    data: {
      workspaceId,
      campaignId: campaignId || null,
      contactId: contactId || null,
      email,
      eventType: 'OPENED',
      metadata: {
        ipAddress: message.open?.ipAddress,
        userAgent: message.open?.userAgent,
        sesMessageId: message.mail?.messageId,
      },
      occurredAt: message.open?.timestamp
        ? new Date(message.open.timestamp)
        : new Date(),
    },
  });
}

async function handleClick(
  message: SesEventMessage,
  workspaceId: string,
  campaignId?: string,
  contactId?: string,
) {
  const emails = message.mail?.destination || [];
  const email = emails[0];
  if (!email) return;

  await prisma.emailEvent.create({
    data: {
      workspaceId,
      campaignId: campaignId || null,
      contactId: contactId || null,
      email,
      eventType: 'CLICKED',
      metadata: {
        linkUrl: message.click?.link,
        ipAddress: message.click?.ipAddress,
        userAgent: message.click?.userAgent,
        sesMessageId: message.mail?.messageId,
      },
      occurredAt: message.click?.timestamp
        ? new Date(message.click.timestamp)
        : new Date(),
    },
  });
}

// ── Auto-Suppression ─────────────────────────────────────────

/**
 * Automatically suppress an email address and update the contact status.
 * Uses a Prisma transaction to ensure atomicity.
 */
async function autoSuppress(
  workspaceId: string,
  email: string,
  reason: 'BOUNCE_HARD' | 'COMPLAINT',
  campaignId?: string,
) {
  await prisma.$transaction(async (tx) => {
    // Add to suppression list (upsert to avoid duplicate errors)
    await tx.suppression.upsert({
      where: { workspaceId_email: { workspaceId, email } },
      update: {
        reason,
        sourceCampaignId: campaignId || null,
        note: `Auto-suppressed due to ${reason === 'BOUNCE_HARD' ? 'hard bounce' : 'complaint'}`,
      },
      create: {
        workspaceId,
        email,
        reason,
        sourceCampaignId: campaignId || null,
        note: `Auto-suppressed due to ${reason === 'BOUNCE_HARD' ? 'hard bounce' : 'complaint'}`,
      },
    });

    // Update contact status
    const newStatus = reason === 'BOUNCE_HARD' ? 'BOUNCED' : 'COMPLAINED';
    await tx.contact.updateMany({
      where: { workspaceId, email },
      data: { status: newStatus },
    });
  });

  console.log(
    `[event-service] Auto-suppressed ${email} in workspace ${workspaceId}: ${reason}`,
  );
}
