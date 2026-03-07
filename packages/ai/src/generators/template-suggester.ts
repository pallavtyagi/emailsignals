import { AIService } from '../ai-service';
import type { TemplateSuggestionRequest, TemplateSuggestionResponse } from '../types';

const SYSTEM_PROMPT = `You are an email marketing expert. Based on the campaign details, recommend the most suitable email template categories and styles.

Available template categories:
- ecommerce: Product showcases, sale announcements, order confirmations
- saas: Feature announcements, onboarding, usage reports
- newsletter: Regular updates, content roundups, industry news
- event: Event invitations, reminders, follow-ups
- announcement: Company news, product launches, updates
- transactional: Receipts, password resets, account notifications

Respond with JSON:
{
  "suggestions": [
    {
      "templateId": "category_name",
      "templateName": "Descriptive template name",
      "reasoning": "Why this template fits",
      "matchScore": 0.95
    }
  ]
}

Provide 3 suggestions ranked by relevance.`;

export async function suggestTemplate(
  service: AIService,
  request: TemplateSuggestionRequest,
): Promise<TemplateSuggestionResponse> {
  const userPrompt = buildPrompt(request);
  const response = await service.generateJson<TemplateSuggestionResponse>(
    SYSTEM_PROMPT,
    userPrompt,
  );

  if (!response.suggestions || !Array.isArray(response.suggestions)) {
    throw new Error('Invalid AI response: missing suggestions');
  }

  response.suggestions = response.suggestions.slice(0, 3).map((s) => ({
    templateId: String(s.templateId || ''),
    templateName: String(s.templateName || ''),
    reasoning: String(s.reasoning || ''),
    matchScore: typeof s.matchScore === 'number' ? Math.min(1, Math.max(0, s.matchScore)) : 0.5,
  }));

  return response;
}

function buildPrompt(request: TemplateSuggestionRequest): string {
  const parts = [`Campaign Type: ${request.campaignType}`];

  if (request.industry) parts.push(`Industry: ${request.industry}`);
  if (request.goal) parts.push(`Goal: ${request.goal}`);
  if (request.tone) parts.push(`Tone: ${request.tone}`);

  parts.push('\nSuggest 3 template types ranked by relevance.');
  return parts.join('\n');
}
