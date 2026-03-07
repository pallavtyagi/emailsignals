import type { DomainStatus } from '../constants';

export interface Domain {
  id: string;
  workspaceId: string;
  domain: string;
  status: DomainStatus;
  spfValid: boolean;
  dkimValid: boolean;
  dmarcValid: boolean;
  reputationScore: number | null;
  sesIdentityArn: string | null;
  warmupEnabled: boolean;
  warmupDay: number;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt: Date | null;
}

export interface DnsRecord {
  type: 'TXT' | 'CNAME' | 'MX';
  name: string;
  value: string;
  purpose: 'spf' | 'dkim' | 'dmarc' | 'tracking';
  valid: boolean;
}

export interface DomainHealth {
  id: string;
  domain: string;
  reputationScore: number;
  blacklisted: boolean;
  blacklistsChecked: string[];
  lastCheckedAt: Date;
}

export interface CreateDomainRequest {
  workspaceId: string;
  domain: string;
}

export interface CreateDomainResponse {
  id: string;
  domain: string;
  status: 'pending';
  dnsRecords: DnsRecord[];
}
