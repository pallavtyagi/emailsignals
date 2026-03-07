export interface SubjectLineRequest {
  campaignName: string;
  campaignType: string;
  targetAudience: string;
  tone?: 'professional' | 'friendly' | 'urgent' | 'playful' | 'formal';
  industry?: string;
  keyPoints?: string[];
  previousSubjectLines?: string[];
}

export interface SubjectLineResponse {
  variants: SubjectLineVariant[];
}

export interface SubjectLineVariant {
  subject: string;
  reasoning: string;
  estimatedOpenRate: 'low' | 'medium' | 'high';
}

export interface EmailCopyRequest {
  subject: string;
  prompt: string;
  tone?: 'professional' | 'friendly' | 'urgent' | 'playful' | 'formal';
  industry?: string;
  targetAudience?: string;
  callToAction?: string;
  maxLength?: number;
  existingCopy?: string;
  action: 'generate' | 'refine';
}

export interface EmailCopyResponse {
  html: string;
  text: string;
  suggestions: string[];
}

export interface TemplateSuggestionRequest {
  campaignType: string;
  industry?: string;
  goal?: string;
  tone?: string;
}

export interface TemplateSuggestionResponse {
  suggestions: TemplateSuggestion[];
}

export interface TemplateSuggestion {
  templateId: string;
  templateName: string;
  reasoning: string;
  matchScore: number;
}

export interface AIServiceConfig {
  apiKey: string;
  model?: string;
  maxRetries?: number;
  timeout?: number;
}
