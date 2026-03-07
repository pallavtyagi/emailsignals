import type { FastifyInstance } from 'fastify';

export async function aiRoutes(app: FastifyInstance) {
  // POST /v1/ai/subject-lines
  app.post('/subject-lines', async (request, reply) => {
    // Auth is enforced by global middleware -- request.auth is available
    try {
      const { AIService, generateSubjectLines } = await import('@signalwave/ai');

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return reply.status(503).send({
          error: { code: 'AI_NOT_CONFIGURED', message: 'AI service not configured' },
        });
      }

      const service = new AIService({ apiKey });
      const body = request.body as Record<string, unknown>;

      const result = await generateSubjectLines(service, {
        campaignName: body.campaignName as string,
        campaignType: body.campaignType as string,
        targetAudience: body.targetAudience as string,
        tone: body.tone as
          | 'professional'
          | 'friendly'
          | 'urgent'
          | 'playful'
          | 'formal'
          | undefined,
        industry: body.industry as string | undefined,
        keyPoints: body.keyPoints as string[] | undefined,
      });

      return result;
    } catch (err) {
      app.log.error({ err }, 'AI subject line generation failed');
      return reply.status(500).send({
        error: { code: 'AI_ERROR', message: 'Failed to generate subject lines' },
      });
    }
  });

  // POST /v1/ai/email-copy
  app.post('/email-copy', async (request, reply) => {
    try {
      const { AIService, generateEmailCopy } = await import('@signalwave/ai');

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return reply.status(503).send({ error: { code: 'AI_NOT_CONFIGURED' } });
      }

      const service = new AIService({ apiKey });
      const body = request.body as Record<string, unknown>;

      const result = await generateEmailCopy(service, {
        subject: body.subject as string,
        prompt: body.prompt as string,
        tone: body.tone as
          | 'professional'
          | 'friendly'
          | 'urgent'
          | 'playful'
          | 'formal'
          | undefined,
        industry: body.industry as string | undefined,
        targetAudience: body.targetAudience as string | undefined,
        callToAction: body.callToAction as string | undefined,
        maxLength: body.maxLength as number | undefined,
        existingCopy: body.existingCopy as string | undefined,
        action: (body.action as 'generate' | 'refine') || 'generate',
      });

      return result;
    } catch (err) {
      app.log.error({ err }, 'AI email copy generation failed');
      return reply.status(500).send({
        error: { code: 'AI_ERROR', message: 'Failed to generate email copy' },
      });
    }
  });

  // POST /v1/ai/template-suggestions
  app.post('/template-suggestions', async (request, reply) => {
    try {
      const { AIService, suggestTemplate } = await import('@signalwave/ai');

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return reply.status(503).send({ error: { code: 'AI_NOT_CONFIGURED' } });
      }

      const service = new AIService({ apiKey });
      const body = request.body as Record<string, unknown>;

      const result = await suggestTemplate(service, {
        campaignType: body.campaignType as string,
        industry: body.industry as string | undefined,
        goal: body.goal as string | undefined,
        tone: body.tone as string | undefined,
      });

      return result;
    } catch (err) {
      app.log.error({ err }, 'AI template suggestion failed');
      return reply.status(500).send({
        error: { code: 'AI_ERROR', message: 'Failed to suggest templates' },
      });
    }
  });
}
