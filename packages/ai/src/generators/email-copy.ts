import { AIService } from '../ai-service';
import type { EmailCopyRequest, EmailCopyResponse } from '../types';

const GENERATE_SYSTEM_PROMPT = `You are an expert email marketing copywriter. Generate compelling email body content that drives engagement and conversions.

Rules:
- Write clean, semantic HTML suitable for email clients
- Use inline styles only (no <style> blocks)
- Include a clear call-to-action
- Keep paragraphs short (2-3 sentences max)
- Use a conversational, engaging tone appropriate to the specified style
- Support merge tags like {{first_name}}, {{company}}
- Avoid spam trigger words

Respond with JSON:
{
  "html": "<html email body content>",
  "text": "<plain text version>",
  "suggestions": ["improvement suggestion 1", "suggestion 2"]
}`;

const REFINE_SYSTEM_PROMPT = `You are an expert email marketing copywriter. Refine and improve the provided email copy.

Rules:
- Maintain the original message intent
- Improve clarity, engagement, and conversion potential
- Fix any grammar or formatting issues
- Optimize for email client rendering (inline styles, simple HTML)
- Provide actionable improvement suggestions

Respond with JSON:
{
  "html": "<improved html email body>",
  "text": "<improved plain text version>",
  "suggestions": ["what was changed and why"]
}`;

export async function generateEmailCopy(
  service: AIService,
  request: EmailCopyRequest,
): Promise<EmailCopyResponse> {
  const systemPrompt =
    request.action === 'refine' ? REFINE_SYSTEM_PROMPT : GENERATE_SYSTEM_PROMPT;
  const userPrompt = buildPrompt(request);

  const response = await service.generateJson<EmailCopyResponse>(systemPrompt, userPrompt);

  if (!response.html || typeof response.html !== 'string') {
    throw new Error('Invalid AI response: missing html content');
  }

  return {
    html: response.html,
    text: response.text || stripHtml(response.html),
    suggestions: Array.isArray(response.suggestions) ? response.suggestions.slice(0, 5) : [],
  };
}

function buildPrompt(request: EmailCopyRequest): string {
  const parts = [`Subject: ${request.subject}`, `Prompt: ${request.prompt}`];

  if (request.tone) parts.push(`Tone: ${request.tone}`);
  if (request.industry) parts.push(`Industry: ${request.industry}`);
  if (request.targetAudience) parts.push(`Target Audience: ${request.targetAudience}`);
  if (request.callToAction) parts.push(`Call to Action: ${request.callToAction}`);
  if (request.maxLength) parts.push(`Max Length: approximately ${request.maxLength} words`);
  if (request.existingCopy && request.action === 'refine') {
    parts.push(`\nExisting copy to refine:\n${request.existingCopy}`);
  }

  return parts.join('\n');
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
