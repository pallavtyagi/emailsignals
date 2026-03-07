import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';

const requestContextPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const requestId =
      (request.headers['x-request-id'] as string) || crypto.randomUUID();

    // Attach child logger with request ID
    request.log = request.log.child({ requestId });

    // Set response header
    reply.header('X-Request-ID', requestId);

    // Track start time for response duration logging
    (request as unknown as { startTime: bigint }).startTime = process.hrtime.bigint();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const startTime = (request as unknown as { startTime: bigint }).startTime;
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;

    request.log.info(
      { responseTime: Math.round(durationMs * 100) / 100, statusCode: reply.statusCode },
      'request completed',
    );
  });
};

export default fp(requestContextPlugin, {
  name: 'request-context',
  fastify: '5.x',
});
