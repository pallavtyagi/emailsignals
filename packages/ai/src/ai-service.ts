import Anthropic from '@anthropic-ai/sdk';
import type { AIServiceConfig } from './types';

export class AIService {
  private client: Anthropic;
  private model: string;
  private maxRetries: number;

  constructor(config: AIServiceConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      maxRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 30_000,
    });
    this.model = config.model ?? 'claude-sonnet-4-20250514';
    this.maxRetries = config.maxRetries ?? 3;
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from AI');
    }
    return textBlock.text;
  }

  async generateJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
    const response = await this.generateText(
      systemPrompt + '\n\nRespond with valid JSON only. No markdown, no code fences.',
      userPrompt,
    );

    try {
      return JSON.parse(response) as T;
    } catch {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  getClient(): Anthropic {
    return this.client;
  }

  getModel(): string {
    return this.model;
  }
}
