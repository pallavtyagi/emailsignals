import type { ContactStatus, CustomFieldType, SuppressionReason } from '../constants';

export interface Contact {
  id: string;
  workspaceId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  status: ContactStatus;
  tags: string[];
  customFields: Record<string, string | number | boolean | null>;
  consentSource: string | null;
  consentedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactList {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  contactCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomFieldDefinition {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  type: CustomFieldType;
  createdAt: Date;
}

export interface Suppression {
  id: string;
  workspaceId: string;
  email: string;
  reason: SuppressionReason;
  sourceCampaignId: string | null;
  note: string | null;
  suppressedAt: Date;
}

export interface ImportJob {
  id: string;
  workspaceId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  totalSubmitted: number;
  processed: number;
  failed: number;
  errors: ImportError[];
  createdAt: Date;
  completedAt: Date | null;
}

export interface ImportError {
  row: number;
  email: string;
  error: string;
}

export interface CsvFieldMapping {
  csvColumn: string;
  contactField: string;
}
