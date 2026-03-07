/**
 * Compliance Service
 *
 * Provides CAN-SPAM and RFC 8058 compliance utilities:
 * - Unsubscribe link injection into HTML emails
 * - List-Unsubscribe header generation (RFC 8058 one-click)
 * - CAN-SPAM physical address footer injection
 * - Signed unsubscribe URL generation and verification
 */

import crypto from 'crypto';

// ── Configuration ────────────────────────────────────────────

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || 'signalwave-unsub-secret-change-me';
const APP_URL = process.env.APP_URL || 'http://localhost:3001';
const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';

// ── Token Generation & Verification ─────────────────────────

/**
 * Generate a signed unsubscribe URL for a specific campaign and contact.
 * The token encodes campaignId, contactId, and a timestamp, signed with HMAC.
 */
export function generateUnsubscribeUrl(campaignId: string, contactId: string): string {
  const token = generateUnsubscribeToken(campaignId, contactId);
  return `${APP_URL}/v1/unsubscribe/${token}`;
}

/**
 * Generate the raw token (without URL prefix).
 */
export function generateUnsubscribeToken(campaignId: string, contactId: string): string {
  const payload = `${campaignId}:${contactId}:${Date.now()}`;
  const signature = crypto
    .createHmac('sha256', UNSUBSCRIBE_SECRET)
    .update(payload)
    .digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');
  return token;
}

/**
 * Verify and decode an unsubscribe token.
 * Returns the campaignId and contactId if valid, throws otherwise.
 */
export function verifyUnsubscribeToken(token: string): {
  campaignId: string;
  contactId: string;
  timestamp: number;
} {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');

    if (parts.length < 4) {
      throw new Error('Invalid token format');
    }

    const campaignId = parts[0]!;
    const contactId = parts[1]!;
    const timestamp = parseInt(parts[2]!, 10);
    const signature = parts[3]!;

    // Recompute signature to verify
    const payload = `${campaignId}:${contactId}:${timestamp}`;
    const expectedSig = crypto
      .createHmac('sha256', UNSUBSCRIBE_SECRET)
      .update(payload)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      throw new Error('Invalid token signature');
    }

    // Tokens are valid for 90 days
    const maxAge = 90 * 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > maxAge) {
      throw new Error('Token expired');
    }

    return { campaignId, contactId, timestamp };
  } catch {
    throw new Error('Invalid or expired unsubscribe token');
  }
}

// ── HTML Injection ───────────────────────────────────────────

/**
 * Inject an unsubscribe link into the email HTML.
 * Places the link before the closing </body> tag, or appends if no body tag.
 */
export function injectUnsubscribeLink(
  html: string,
  campaignId: string,
  contactId: string,
): string {
  const unsubUrl = generateUnsubscribeUrl(campaignId, contactId);

  const unsubBlock = `
<div style="text-align:center;padding:16px 0;font-size:12px;color:#888888;font-family:Arial,sans-serif;">
  <a href="${unsubUrl}" style="color:#888888;text-decoration:underline;">Unsubscribe</a>
  from this mailing list.
</div>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${unsubBlock}</body>`);
  }

  return html + unsubBlock;
}

/**
 * Inject a CAN-SPAM compliant physical address footer into the email HTML.
 * The physical address should include the workspace's registered postal address.
 */
export function injectCanSpamFooter(html: string, workspaceAddress: string): string {
  const escapedAddress = escapeHtml(workspaceAddress);

  const footer = `
<div style="text-align:center;padding:8px 16px;font-size:11px;color:#999999;font-family:Arial,sans-serif;border-top:1px solid #eeeeee;margin-top:16px;">
  <p style="margin:4px 0;">${escapedAddress}</p>
  <p style="margin:4px 0;">This email was sent because you opted in to receive communications from us.</p>
</div>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`);
  }

  return html + footer;
}

// ── Email Headers ────────────────────────────────────────────

/**
 * Generate RFC 8058 List-Unsubscribe and List-Unsubscribe-Post headers
 * for one-click unsubscribe support in email clients like Gmail.
 */
export function addListUnsubscribeHeader(
  campaignId: string,
  contactId: string,
): Record<string, string> {
  const unsubUrl = generateUnsubscribeUrl(campaignId, contactId);

  return {
    'List-Unsubscribe': `<${unsubUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

/**
 * Generate the full unsubscribe confirmation page HTML.
 * Shown after a user clicks the unsubscribe link.
 */
export function generateUnsubscribeConfirmationPage(email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Unsubscribed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background-color: #f9fafb;
      color: #374151;
    }
    .card {
      text-align: center;
      padding: 48px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      max-width: 480px;
    }
    h1 { font-size: 24px; margin-bottom: 8px; }
    p { color: #6b7280; line-height: 1.6; }
    .email { font-weight: 600; color: #374151; }
    .check { font-size: 48px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">&#10003;</div>
    <h1>You've been unsubscribed</h1>
    <p>
      <span class="email">${escapeHtml(email)}</span> has been removed from our mailing list.
      You will no longer receive marketing emails from us.
    </p>
    <p>If this was a mistake, you can re-subscribe through our website.</p>
  </div>
</body>
</html>`;
}

// ── Helpers ──────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
