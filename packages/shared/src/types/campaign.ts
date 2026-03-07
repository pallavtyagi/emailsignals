import type { CampaignStatus, CampaignType } from '../constants';

export interface Campaign {
  id: string;
  workspaceId: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  subject: string;
  previewText: string | null;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  domainId: string;
  templateId: string | null;
  html: string | null;
  listIds: string[];
  exclusionListIds: string[];
  utmParams: UtmParams | null;
  scheduledAt: Date | null;
  sentAt: Date | null;
  completedAt: Date | null;
  estimatedRecipients: number;
  sentCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UtmParams {
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
}

export interface CampaignSendOptions {
  sendAt?: Date;
  timezone?: string;
}

export interface TestSendRequest {
  to: string[];
  testContactId?: string;
}

export interface CampaignStatsSummary {
  sent: number;
  delivered: number;
  deliveryRate: number;
  opens: number;
  uniqueOpens: number;
  openRate: number;
  clicks: number;
  uniqueClicks: number;
  clickRate: number;
  bouncedHard: number;
  bouncedSoft: number;
  bounceRate: number;
  unsubscribes: number;
  unsubscribeRate: number;
  complaints: number;
  complaintRate: number;
  failed: number;
}
