import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'CLERK_SECRET_KEY'] as const;

const RECOMMENDED_ENV_VARS = [
  'REDIS_URL',
  'AWS_REGION',
  'STRIPE_SECRET_KEY',
  'WEB_URL',
] as const;

const startupValidationPlugin: FastifyPluginAsync = async (fastify) => {
  const missing: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  for (const envVar of RECOMMENDED_ENV_VARS) {
    if (!process.env[envVar]) {
      fastify.log.warn(`Missing recommended env var: ${envVar}`);
    }
  }

  fastify.log.info('Startup validation passed');
};

export default fp(startupValidationPlugin, {
  name: 'startup-validation',
  fastify: '5.x',
});
