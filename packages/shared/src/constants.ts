// Workspace Roles
export const WORKSPACE_ROLES = ['owner', 'admin', 'marketer', 'analyst'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

// Domain Status
export const DOMAIN_STATUSES = ['pending', 'verified', 'degraded', 'failed'] as const;
export type DomainStatus = (typeof DOMAIN_STATUSES)[number];

// Contact Status
export const CONTACT_STATUSES = ['subscribed', 'unsubscribed', 'bounced', 'complained'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

// Campaign Status
export const CAMPAIGN_STATUSES = [
  'draft',
  'scheduled',
  'sending',
  'sent',
  'paused',
  'cancelled',
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

// Campaign Types
export const CAMPAIGN_TYPES = ['blast', 'scheduled', 'ab_test'] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

// Email Event Types
export const EMAIL_EVENT_TYPES = [
  'delivered',
  'opened',
  'clicked',
  'bounced_hard',
  'bounced_soft',
  'complained',
  'unsubscribed',
  'failed',
] as const;
export type EmailEventType = (typeof EMAIL_EVENT_TYPES)[number];

// Suppression Reasons
export const SUPPRESSION_REASONS = [
  'BOUNCE_HARD',
  'BOUNCE_SOFT_MAX',
  'COMPLAINT',
  'UNSUBSCRIBE',
  'MANUAL',
] as const;
export type SuppressionReason = (typeof SUPPRESSION_REASONS)[number];

// Billing Plans
export const BILLING_PLANS = ['starter', 'growth', 'business', 'enterprise'] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

export const PLAN_LIMITS = {
  starter: { monthlyEmails: 10_000, price: 2900, apiRateRead: 300, apiRateWrite: 60 },
  growth: { monthlyEmails: 50_000, price: 7900, apiRateRead: 600, apiRateWrite: 120 },
  business: { monthlyEmails: 200_000, price: 19900, apiRateRead: 1000, apiRateWrite: 300 },
  enterprise: { monthlyEmails: Infinity, price: 0, apiRateRead: 10000, apiRateWrite: 2000 },
} as const;

export const OVERAGE_RATE_PER_1000 = 100; // $1.00 in cents

// Template Categories
export const TEMPLATE_CATEGORIES = [
  'ecommerce',
  'saas',
  'newsletter',
  'event',
  'announcement',
  'transactional',
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

// API Scopes
export const API_SCOPES = ['read', 'write', 'send', 'admin'] as const;
export type ApiScope = (typeof API_SCOPES)[number];

// Custom Fields
export const CUSTOM_FIELD_TYPES = ['text', 'number', 'date', 'boolean'] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];
export const MAX_CUSTOM_FIELDS_PER_WORKSPACE = 50;

// Warm-up Schedule (days -> max daily volume)
export const WARMUP_SCHEDULE: Record<number, number> = {
  1: 50,
  2: 100,
  3: 200,
  4: 500,
  5: 1000,
  6: 2000,
  7: 5000,
  8: 10000,
  9: 20000,
  10: 40000,
  11: 70000,
  12: 100000,
  13: 150000,
  14: 200000,
};

// Pagination
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

// CSV Import
export const MAX_CSV_IMPORT_SIZE = 10_000;
export const MAX_BATCH_IMPORT_SIZE = 10_000;

// Test Email
export const MAX_TEST_EMAIL_RECIPIENTS = 5;

// Webhook
export const MAX_WEBHOOKS_PER_WORKSPACE = 10;
