import type { BillingPlan } from '../constants';

export interface Subscription {
  id: string;
  workspaceId: string;
  plan: BillingPlan;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: 'active' | 'past_due' | 'cancelled' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  emailsUsed: number;
  emailsLimit: number;
  createdAt: Date;
}

export interface UsageSummary {
  workspaceId: string;
  plan: BillingPlan;
  emailsUsed: number;
  emailsLimit: number;
  usagePercent: number;
  overage: number;
  overageCost: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void';
  invoiceUrl: string;
  createdAt: Date;
}
