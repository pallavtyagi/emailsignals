/**
 * Test fixture factories and helpers.
 */

export function createMockWorkspace(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ws_test123',
    name: 'Test Workspace',
    slug: 'test-workspace',
    plan: 'GROWTH',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createMockContact(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ct_test123',
    workspaceId: 'ws_test123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    company: 'Acme Inc',
    phone: null,
    status: 'SUBSCRIBED',
    tags: [],
    customFields: {},
    consentSource: 'signup',
    consentedAt: new Date('2025-01-01'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createMockCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cmp_test123',
    workspaceId: 'ws_test123',
    name: 'Test Campaign',
    type: 'BLAST',
    status: 'DRAFT',
    subject: 'Hello World',
    previewText: 'Preview text',
    fromName: 'Sender',
    fromEmail: 'sender@example.com',
    replyTo: null,
    domainId: 'dom_test123',
    templateId: null,
    html: '<p>Hello</p>',
    htmlSnapshot: null,
    utmParams: null,
    tags: [],
    estimatedRecipients: 100,
    sentCount: 0,
    scheduledAt: null,
    sentAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createMockDomain(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dom_test123',
    workspaceId: 'ws_test123',
    domain: 'example.com',
    status: 'VERIFIED',
    sesIdentityArn: 'arn:aws:ses:us-east-1:123456789:identity/example.com',
    spfValid: true,
    dkimValid: true,
    dmarcValid: true,
    dnsRecords: {},
    reputationScore: 100,
    verifiedAt: new Date('2025-01-01'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createMockSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_test123',
    workspaceId: 'ws_test123',
    stripeCustomerId: 'cus_test123',
    stripeSubscriptionId: 'sub_stripe_test123',
    plan: 'GROWTH',
    status: 'ACTIVE',
    emailsUsed: 5000,
    emailsLimit: 50000,
    currentPeriodStart: new Date('2025-01-01'),
    currentPeriodEnd: new Date('2025-02-01'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createMockTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tpl_test123',
    workspaceId: 'ws_test123',
    name: 'Test Template',
    subject: 'Template Subject',
    html: '<p>Template content</p>',
    category: 'newsletter',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createMockContactList(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lst_test123',
    workspaceId: 'ws_test123',
    name: 'Test List',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}
