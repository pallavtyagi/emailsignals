/**
 * Vitest test setup - mocks external dependencies.
 */
import { vi } from 'vitest';

// Mock Prisma client
vi.mock('../db/client.js', () => ({
  prisma: createMockPrismaClient(),
}));

// Mock SES provider
vi.mock('../providers/ses.js', () => ({
  createEmailIdentity: vi.fn(),
  getEmailIdentity: vi.fn(),
  deleteEmailIdentity: vi.fn(),
  sendEmail: vi.fn(),
  sendBulkEmail: vi.fn(),
}));

// Mock BullMQ queues
vi.mock('../queues/index.js', () => ({
  emailSendingQueue: { add: vi.fn().mockResolvedValue({}) },
  scheduledCampaignsQueue: { add: vi.fn().mockResolvedValue({}) },
  domainVerificationQueue: { add: vi.fn().mockResolvedValue({}) },
  csvImportQueue: { add: vi.fn().mockResolvedValue({}) },
}));

// Helper: create a mock Prisma client with common model methods
function createMockPrismaClient() {
  const modelMethods = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  });

  return {
    campaign: modelMethods(),
    contact: modelMethods(),
    contactList: modelMethods(),
    contactListMembership: modelMethods(),
    domain: modelMethods(),
    template: modelMethods(),
    subscription: modelMethods(),
    suppression: modelMethods(),
    emailEvent: modelMethods(),
    sendJob: modelMethods(),
    campaignExclusion: modelMethods(),
    customFieldDefinition: modelMethods(),
    workspace: modelMethods(),
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => {
      // Execute the callback with the same mock client
      const txClient = {
        suppression: modelMethods(),
        contact: modelMethods(),
        emailEvent: modelMethods(),
      };
      return fn(txClient);
    }),
  };
}
