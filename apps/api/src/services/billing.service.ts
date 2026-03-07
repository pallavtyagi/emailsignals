/**
 * Stripe Billing Service
 *
 * Handles Stripe integration for subscription management:
 * - Checkout session creation
 * - Customer portal sessions
 * - Webhook event processing
 * - Usage tracking and overage calculation
 */

import Stripe from 'stripe';
import { prisma } from '../db/client.js';
import {
  NotFoundError,
  BadRequestError,
  ValidationError,
  ServiceUnavailableError,
} from '../lib/errors.js';
import { PLAN_LIMITS, OVERAGE_RATE_PER_1000 } from '@signalwave/shared';

// ── Configuration ────────────────────────────────────────────

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:3001';
const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';

// Price IDs in Stripe for each plan
const PLAN_PRICE_IDS: Record<string, string> = {
  STARTER: process.env.STRIPE_PRICE_STARTER || 'price_starter',
  GROWTH: process.env.STRIPE_PRICE_GROWTH || 'price_growth',
  BUSINESS: process.env.STRIPE_PRICE_BUSINESS || 'price_business',
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
};

// ── Stripe Client ────────────────────────────────────────────

function getStripeClient(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new ServiceUnavailableError('Stripe is not configured');
  }
  return new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
    typescript: true,
  });
}

// ── Checkout ─────────────────────────────────────────────────

/**
 * Create a Stripe Checkout session for subscribing to a plan.
 */
export async function createCheckoutSession(
  workspaceId: string,
  plan: string,
) {
  const stripe = getStripeClient();
  const planKey = plan.toUpperCase();
  const priceId = PLAN_PRICE_IDS[planKey];

  if (!priceId) {
    throw new ValidationError(`Unknown plan: ${plan}`);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { subscription: true },
  });

  if (!workspace) {
    throw new NotFoundError('Workspace', workspaceId);
  }

  // If already subscribed, redirect to portal instead
  if (workspace.subscription?.stripeCustomerId) {
    throw new BadRequestError(
      'Workspace already has a subscription. Use the billing portal to change plans.',
      'ALREADY_SUBSCRIBED',
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      workspaceId,
      plan: planKey,
    },
    success_url: `${WEB_URL}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${WEB_URL}/settings/billing?cancelled=true`,
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

// ── Customer Portal ──────────────────────────────────────────

/**
 * Create a Stripe Customer Portal session for managing the subscription.
 */
export async function createPortalSession(workspaceId: string) {
  const stripe = getStripeClient();

  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
  });

  if (!subscription) {
    throw new NotFoundError('Subscription');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${WEB_URL}/settings/billing`,
  });

  return {
    url: session.url,
  };
}

// ── Webhook Processing ───────────────────────────────────────

/**
 * Verify Stripe webhook signature and return the parsed event.
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
): Stripe.Event {
  const stripe = getStripeClient();

  if (!STRIPE_WEBHOOK_SECRET) {
    throw new ServiceUnavailableError('Stripe webhook secret not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
}

/**
 * Process a verified Stripe webhook event.
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<{ handled: boolean }> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      return { handled: true };

    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      return { handled: true };

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      return { handled: true };

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      return { handled: true };

    default:
      return { handled: false };
  }
}

// ── Webhook Event Handlers ───────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspaceId;
  const plan = session.metadata?.plan || 'STARTER';

  if (!workspaceId) {
    console.error('[billing] Checkout session missing workspaceId in metadata');
    return;
  }

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) {
    console.error('[billing] Checkout session missing customer or subscription');
    return;
  }

  // Fetch subscription details from Stripe for period dates
  const stripe = getStripeClient();
  const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

  const planKey = plan.toUpperCase() as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[planKey.toLowerCase() as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.starter;

  await prisma.subscription.upsert({
    where: { workspaceId },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      plan: planKey as 'STARTER' | 'GROWTH' | 'BUSINESS' | 'ENTERPRISE',
      status: 'ACTIVE',
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      emailsLimit: limits.monthlyEmails === Infinity ? 999_999_999 : limits.monthlyEmails,
      emailsUsed: 0,
    },
    create: {
      workspaceId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      plan: planKey as 'STARTER' | 'GROWTH' | 'BUSINESS' | 'ENTERPRISE',
      status: 'ACTIVE',
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      emailsLimit: limits.monthlyEmails === Infinity ? 999_999_999 : limits.monthlyEmails,
      emailsUsed: 0,
    },
  });

  console.log(
    `[billing] Subscription created for workspace ${workspaceId}: ${plan}`,
  );
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!subscription) {
    console.warn(`[billing] Invoice paid for unknown subscription: ${subscriptionId}`);
    return;
  }

  // Fetch updated subscription from Stripe
  const stripe = getStripeClient();
  const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

  // Reset usage counter and update period dates
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      emailsUsed: 0,
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      status: 'ACTIVE',
    },
  });

  console.log(
    `[billing] Invoice paid - usage reset for workspace ${subscription.workspaceId}`,
  );
}

async function handleSubscriptionUpdated(stripeSub: Stripe.Subscription) {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSub.id },
  });

  if (!subscription) {
    console.warn(`[billing] Updated unknown subscription: ${stripeSub.id}`);
    return;
  }

  // Determine new plan from price
  const priceId = stripeSub.items.data[0]?.price?.id;
  let newPlan = subscription.plan;

  if (priceId) {
    for (const [plan, id] of Object.entries(PLAN_PRICE_IDS)) {
      if (id === priceId) {
        newPlan = plan as typeof subscription.plan;
        break;
      }
    }
  }

  const limits = PLAN_LIMITS[newPlan.toLowerCase() as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.starter;

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELLED',
    trialing: 'TRIALING',
  };
  const newStatus = statusMap[stripeSub.status] || 'ACTIVE';

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      plan: newPlan as 'STARTER' | 'GROWTH' | 'BUSINESS' | 'ENTERPRISE',
      status: newStatus as 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIALING',
      emailsLimit: limits.monthlyEmails === Infinity ? 999_999_999 : limits.monthlyEmails,
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
    },
  });

  console.log(
    `[billing] Subscription updated for workspace ${subscription.workspaceId}: ${newPlan} (${newStatus})`,
  );
}

async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSub.id },
  });

  if (!subscription) {
    console.warn(`[billing] Deleted unknown subscription: ${stripeSub.id}`);
    return;
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'CANCELLED' },
  });

  console.log(
    `[billing] Subscription cancelled for workspace ${subscription.workspaceId}`,
  );
}

// ── Usage Tracking ───────────────────────────────────────────

/**
 * Check if the workspace has remaining email capacity.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export async function checkUsageLimit(workspaceId: string): Promise<{
  allowed: boolean;
  reason?: string;
  emailsUsed: number;
  emailsLimit: number;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
  });

  if (!subscription) {
    return {
      allowed: false,
      reason: 'No active subscription',
      emailsUsed: 0,
      emailsLimit: 0,
    };
  }

  if (subscription.status === 'CANCELLED') {
    return {
      allowed: false,
      reason: 'Subscription is cancelled',
      emailsUsed: subscription.emailsUsed,
      emailsLimit: subscription.emailsLimit,
    };
  }

  // Allow sending even if over limit (overage billing applies)
  // But block if subscription is past due
  if (subscription.status === 'PAST_DUE') {
    return {
      allowed: false,
      reason: 'Subscription payment is past due',
      emailsUsed: subscription.emailsUsed,
      emailsLimit: subscription.emailsLimit,
    };
  }

  return {
    allowed: true,
    emailsUsed: subscription.emailsUsed,
    emailsLimit: subscription.emailsLimit,
  };
}

/**
 * Calculate overage for the current billing period.
 */
export function calculateOverage(emailsUsed: number, emailsLimit: number) {
  const overage = Math.max(0, emailsUsed - emailsLimit);
  const overageCost = Math.ceil(overage / 1000) * OVERAGE_RATE_PER_1000;

  return {
    overage,
    overageCost,
    overageCostFormatted: `$${(overageCost / 100).toFixed(2)}`,
  };
}

/**
 * Get full usage summary for a workspace.
 */
export async function getUsageSummary(workspaceId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
  });

  if (!subscription) {
    throw new NotFoundError('Subscription');
  }

  const { overage, overageCost } = calculateOverage(
    subscription.emailsUsed,
    subscription.emailsLimit,
  );

  return {
    workspaceId,
    plan: subscription.plan,
    emailsUsed: subscription.emailsUsed,
    emailsLimit: subscription.emailsLimit,
    usagePercent:
      subscription.emailsLimit > 0
        ? (subscription.emailsUsed / subscription.emailsLimit) * 100
        : 0,
    overage,
    overageCost,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
}
