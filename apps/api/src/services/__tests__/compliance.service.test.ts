import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  generateUnsubscribeUrl,
  injectUnsubscribeLink,
  injectCanSpamFooter,
  addListUnsubscribeHeader,
  generateUnsubscribeConfirmationPage,
} from '../compliance.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Token Generation & Verification ─────────────────────────

describe('generateUnsubscribeToken / verifyUnsubscribeToken', () => {
  it('should generate and verify a valid token', () => {
    const token = generateUnsubscribeToken('cmp_123', 'ct_456');
    const decoded = verifyUnsubscribeToken(token);

    expect(decoded.campaignId).toBe('cmp_123');
    expect(decoded.contactId).toBe('ct_456');
    expect(decoded.timestamp).toBeGreaterThan(0);
  });

  it('should generate unique tokens for different contacts', () => {
    const token1 = generateUnsubscribeToken('cmp_123', 'ct_1');
    const token2 = generateUnsubscribeToken('cmp_123', 'ct_2');
    expect(token1).not.toBe(token2);
  });

  it('should throw for an invalid token', () => {
    expect(() => verifyUnsubscribeToken('invalid-token')).toThrow(
      /Invalid or expired/i,
    );
  });

  it('should throw for a tampered token', () => {
    const token = generateUnsubscribeToken('cmp_123', 'ct_456');
    // Tamper by modifying the base64
    const tampered = token.slice(0, -2) + 'XX';
    expect(() => verifyUnsubscribeToken(tampered)).toThrow(
      /Invalid or expired/i,
    );
  });
});

// ── generateUnsubscribeUrl ──────────────────────────────────

describe('generateUnsubscribeUrl', () => {
  it('should generate a URL containing the APP_URL prefix', () => {
    const url = generateUnsubscribeUrl('cmp_123', 'ct_456');
    expect(url).toContain('/v1/unsubscribe/');
    expect(url).toMatch(/^http/);
  });
});

// ── injectUnsubscribeLink ───────────────────────────────────

describe('injectUnsubscribeLink', () => {
  it('should inject link before </body> tag', () => {
    const html = '<html><body><p>Hello</p></body></html>';
    const result = injectUnsubscribeLink(html, 'cmp_123', 'ct_456');

    expect(result).toContain('Unsubscribe');
    expect(result).toContain('/v1/unsubscribe/');
    expect(result).toContain('</body>');
    // Link should appear before closing body
    const unsubIdx = result.indexOf('Unsubscribe');
    const bodyIdx = result.indexOf('</body>');
    expect(unsubIdx).toBeLessThan(bodyIdx);
  });

  it('should append link when no body tag exists', () => {
    const html = '<p>Hello</p>';
    const result = injectUnsubscribeLink(html, 'cmp_123', 'ct_456');

    expect(result).toContain('Unsubscribe');
    expect(result).toContain('/v1/unsubscribe/');
  });
});

// ── injectCanSpamFooter ─────────────────────────────────────

describe('injectCanSpamFooter', () => {
  it('should inject address before </body> tag', () => {
    const html = '<html><body><p>Hello</p></body></html>';
    const result = injectCanSpamFooter(html, '123 Main St, City, ST 12345');

    expect(result).toContain('123 Main St');
    expect(result).toContain('opted in');
  });

  it('should escape HTML in the address', () => {
    const html = '<html><body></body></html>';
    const result = injectCanSpamFooter(html, '<script>alert("xss")</script>');

    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });
});

// ── addListUnsubscribeHeader ────────────────────────────────

describe('addListUnsubscribeHeader', () => {
  it('should return RFC 8058 compliant headers', () => {
    const headers = addListUnsubscribeHeader('cmp_123', 'ct_456');

    expect(headers['List-Unsubscribe']).toMatch(/^<http.*\/v1\/unsubscribe\/.*>$/);
    expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });
});

// ── generateUnsubscribeConfirmationPage ─────────────────────

describe('generateUnsubscribeConfirmationPage', () => {
  it('should return HTML with the email address', () => {
    const html = generateUnsubscribeConfirmationPage('user@example.com');

    expect(html).toContain('user@example.com');
    expect(html).toContain('unsubscribed');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('should escape HTML in the email', () => {
    const html = generateUnsubscribeConfirmationPage('<script>xss</script>@test.com');

    expect(html).not.toContain('<script>xss</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
