import { AIService } from '../ai-service';
import type { SubjectLineRequest, SubjectLineResponse, SubjectLineVariant } from '../types';

const SYSTEM_PROMPT = `You are an expert email marketing copywriter. Generate compelling email subject lines that maximize open rates.

Rules:
- Each subject line must be under 60 characters
- Use proven techniques: curiosity, urgency, personalization, numbers, questions
- Avoid spam trigger words (free, guarantee, act now, click here)
- Consider the target audience and industry
- Provide variety across the 5 variants (different techniques for each)

Respond with JSON in this exact format:
{
  "variants": [
    {
      "subject": "The subject line text",
      "reasoning": "Brief explanation of the technique used",
      "estimatedOpenRate": "low" | "medium" | "high"
    }
  ]
}`;

export async function generateSubjectLines(
  service: AIService,
  request: SubjectLineRequest,
): Promise<SubjectLineResponse> {
  const userPrompt = buildPrompt(request);
  const response = await service.generateJson<SubjectLineResponse>(SYSTEM_PROMPT, userPrompt);

  // Validate and sanitize
  if (!response.variants || !Array.isArray(response.variants)) {
    throw new Error('Invalid AI response: missing variants array');
  }

  response.variants = response.variants
    .slice(0, 5)
    .map(sanitizeVariant)
    .filter((v): v is SubjectLineVariant => v !== null);

  if (response.variants.length === 0) {
    throw new Error('AI generated no valid subject lines');
  }

  return response;
}

function buildPrompt(request: SubjectLineRequest): string {
  const parts = [
    `Campaign: ${request.campaignName}`,
    `Type: ${request.campaignType}`,
    `Target Audience: ${request.targetAudience}`,
  ];

  if (request.tone) parts.push(`Tone: ${request.tone}`);
  if (request.industry) parts.push(`Industry: ${request.industry}`);
  if (request.keyPoints?.length) {
    parts.push(`Key Points:\n${request.keyPoints.map((p) => `- ${p}`).join('\n')}`);
  }
  if (request.previousSubjectLines?.length) {
    parts.push(
      `Previously used (avoid similar):\n${request.previousSubjectLines.map((s) => `- ${s}`).join('\n')}`,
    );
  }

  parts.push('\nGenerate exactly 5 unique subject line variants.');
  return parts.join('\n');
}

function sanitizeVariant(variant: SubjectLineVariant): SubjectLineVariant | null {
  if (!variant.subject || typeof variant.subject !== 'string') return null;

  return {
    subject: variant.subject.trim().slice(0, 200),
    reasoning: (variant.reasoning || '').trim().slice(0, 500),
    estimatedOpenRate: ['low', 'medium', 'high'].includes(variant.estimatedOpenRate)
      ? variant.estimatedOpenRate
      : 'medium',
  };
}
