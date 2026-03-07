import { z } from 'zod';
import { CAMPAIGN_TYPES, MAX_TEST_EMAIL_RECIPIENTS } from '../constants';

export const utmParamsSchema = z.object({
  source: z.string().max(100),
  medium: z.string().max(100),
  campaign: z.string().max(100),
  term: z.string().max(100).optional(),
  content: z.string().max(100).optional(),
});

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(CAMPAIGN_TYPES).default('blast'),
  subject: z.string().min(1).max(500),
  previewText: z.string().max(200).optional(),
  fromName: z.string().min(1).max(100),
  fromEmail: z.string().email(),
  replyTo: z.string().email().optional(),
  domainId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  html: z.string().optional(),
  listIds: z.array(z.string().uuid()).min(1),
  exclusionListIds: z.array(z.string().uuid()).optional(),
  utmParams: utmParamsSchema.optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const sendCampaignSchema = z.object({
  sendAt: z.string().datetime().optional(),
  timezone: z.string().max(50).optional(),
});

export const testSendSchema = z.object({
  to: z.array(z.string().email()).min(1).max(MAX_TEST_EMAIL_RECIPIENTS),
  testContactId: z.string().uuid().optional(),
});

export const campaignQuerySchema = z.object({
  status: z
    .enum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'])
    .optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  after: z.string().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type SendCampaignInput = z.infer<typeof sendCampaignSchema>;
export type TestSendInput = z.infer<typeof testSendSchema>;
export type CampaignQueryInput = z.infer<typeof campaignQuerySchema>;
