import type { EmailEventType } from '../constants';

export interface EmailEvent {
  id: string;
  workspaceId: string;
  campaignId: string | null;
  contactId: string;
  email: string;
  eventType: EmailEventType;
  metadata: EmailEventMetadata;
  occurredAt: Date;
}

export interface EmailEventMetadata {
  linkUrl?: string;
  device?: string;
  client?: string;
  country?: string;
  bounceType?: string;
  bounceMessage?: string;
}

export interface TimeSeriesPoint {
  date: string;
  sent: number;
  opens: number;
  clicks: number;
}

export interface WorkspaceOverview {
  totalSent: number;
  totalDelivered: number;
  avgOpenRate: number;
  avgClickRate: number;
  campaignsSent: number;
  timeSeries: TimeSeriesPoint[];
}

export interface LinkClickStats {
  url: string;
  totalClicks: number;
  uniqueClicks: number;
  clickRate: number;
}
