/**
 * AWS SES v2 Provider
 *
 * Wraps the AWS SESv2 SDK client with domain-specific helpers for identity
 * management, single email sends, and bulk sends.
 */

import {
  SESv2Client,
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  DeleteEmailIdentityCommand,
  SendEmailCommand,
  SendBulkEmailCommand,
  type DkimAttributes,
  type SendBulkEmailCommandInput,
} from '@aws-sdk/client-sesv2';

// ── Types ────────────────────────────────────────────────────

export interface DnsRecord {
  type: 'TXT' | 'CNAME' | 'MX';
  name: string;
  value: string;
  purpose: 'spf' | 'dkim' | 'dmarc' | 'tracking';
}

export interface CreateIdentityResult {
  identityArn?: string;
  dkimRecords: DnsRecord[];
  spfRecord: DnsRecord;
  dmarcRecord: DnsRecord;
}

export interface IdentityVerificationStatus {
  verified: boolean;
  dkimStatus: string;
  dkimRecords: DnsRecord[];
  spfValid: boolean;
  dmarcValid: boolean;
}

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  configurationSetName?: string;
  headers?: Record<string, string>;
  tags?: Array<{ Name: string; Value: string }>;
}

export interface SendEmailResult {
  messageId: string;
}

export interface BulkSendEntry {
  to: string;
  replacementSubject?: string;
  replacementHtml?: string;
  replacementText?: string;
  replacementTags?: Array<{ Name: string; Value: string }>;
}

export interface BulkSendParams {
  from: string;
  defaultSubject: string;
  defaultHtml: string;
  defaultText?: string;
  replyTo?: string;
  configurationSetName?: string;
  entries: BulkSendEntry[];
  headers?: Record<string, string>;
}

export interface BulkSendResult {
  results: Array<{
    status: 'SUCCESS' | 'FAILED';
    messageId?: string;
    error?: string;
  }>;
}

// ── Client Singleton ─────────────────────────────────────────

const sesClient = new SESv2Client({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

const CONFIGURATION_SET = process.env.SES_CONFIGURATION_SET || 'signalwave-production';

// ── Public API ───────────────────────────────────────────────

/**
 * Create an email identity (domain) in SES and return the DNS records
 * the customer needs to add for verification.
 */
export async function createEmailIdentity(domain: string): Promise<CreateIdentityResult> {
  const command = new CreateEmailIdentityCommand({
    EmailIdentity: domain,
    DkimSigningAttributes: {
      DomainSigningPrivateKey: undefined,
      DomainSigningSelector: undefined,
      NextSigningKeyLength: 'RSA_2048_BIT',
    },
    ConfigurationSetName: CONFIGURATION_SET,
    Tags: [{ Key: 'platform', Value: 'signalwave' }],
  });

  const response = await sesClient.send(command);

  const dkimTokens = response.DkimAttributes?.Tokens || [];
  const dkimRecords: DnsRecord[] = dkimTokens.map((token) => ({
    type: 'CNAME' as const,
    name: `${token}._domainkey.${domain}`,
    value: `${token}.dkim.amazonses.com`,
    purpose: 'dkim' as const,
  }));

  const spfRecord: DnsRecord = {
    type: 'TXT',
    name: domain,
    value: 'v=spf1 include:amazonses.com ~all',
    purpose: 'spf',
  };

  const dmarcRecord: DnsRecord = {
    type: 'TXT',
    name: `_dmarc.${domain}`,
    value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@signalwave.com',
    purpose: 'dmarc',
  };

  return {
    identityArn: undefined, // ARN is not returned immediately; use getEmailIdentity
    dkimRecords,
    spfRecord,
    dmarcRecord,
  };
}

/**
 * Get the current verification status of an email identity.
 */
export async function getEmailIdentity(domain: string): Promise<IdentityVerificationStatus> {
  const command = new GetEmailIdentityCommand({
    EmailIdentity: domain,
  });

  const response = await sesClient.send(command);
  const dkim: DkimAttributes = response.DkimAttributes || {};
  const tokens = dkim.Tokens || [];

  const dkimRecords: DnsRecord[] = tokens.map((token) => ({
    type: 'CNAME' as const,
    name: `${token}._domainkey.${domain}`,
    value: `${token}.dkim.amazonses.com`,
    purpose: 'dkim' as const,
  }));

  const dkimVerified = dkim.Status === 'SUCCESS';

  // SES reports overall verification via VerifiedForSendingStatus
  const verified = response.VerifiedForSendingStatus === true;

  return {
    verified,
    dkimStatus: dkim.Status || 'NOT_STARTED',
    dkimRecords,
    spfValid: verified, // SPF validity follows overall sending status
    dmarcValid: verified, // DMARC checked separately; approximate via overall status
  };
}

/**
 * Delete an email identity from SES.
 */
export async function deleteEmailIdentity(domain: string): Promise<void> {
  const command = new DeleteEmailIdentityCommand({
    EmailIdentity: domain,
  });
  await sesClient.send(command);
}

/**
 * Send a single email through SES.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const command = new SendEmailCommand({
    FromEmailAddress: params.from,
    Destination: {
      ToAddresses: [params.to],
    },
    Content: {
      Simple: {
        Subject: { Data: params.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: params.html, Charset: 'UTF-8' },
          ...(params.text ? { Text: { Data: params.text, Charset: 'UTF-8' } } : {}),
        },
        Headers: params.headers
          ? Object.entries(params.headers).map(([Name, Value]) => ({ Name, Value }))
          : undefined,
      },
    },
    ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
    ConfigurationSetName: params.configurationSetName || CONFIGURATION_SET,
    EmailTags: params.tags,
  });

  const response = await sesClient.send(command);

  return {
    messageId: response.MessageId || '',
  };
}

/**
 * Send bulk emails through SES (up to 50 per request).
 */
export async function sendBulkEmail(params: BulkSendParams): Promise<BulkSendResult> {
  const input: SendBulkEmailCommandInput = {
    FromEmailAddress: params.from,
    ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
    ConfigurationSetName: params.configurationSetName || CONFIGURATION_SET,
    DefaultContent: {
      Template: {
        TemplateName: undefined,
        TemplateData: undefined,
        Headers: params.headers
          ? Object.entries(params.headers).map(([Name, Value]) => ({ Name, Value }))
          : undefined,
      },
    },
    BulkEmailEntries: params.entries.map((entry) => ({
      Destination: {
        ToAddresses: [entry.to],
      },
      ReplacementTags: entry.replacementTags,
    })),
  };

  const command = new SendBulkEmailCommand(input);
  const response = await sesClient.send(command);

  const results = (response.BulkEmailEntryResults || []).map((r) => ({
    status: r.Status === 'SUCCESS' ? ('SUCCESS' as const) : ('FAILED' as const),
    messageId: r.MessageId,
    error: r.Error,
  }));

  return { results };
}

export { sesClient, CONFIGURATION_SET };
