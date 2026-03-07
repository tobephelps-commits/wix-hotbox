import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    appVersion: string;
  }
}

export default async function apiRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // Health check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      version: fastify.appVersion,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  // Future domain routes will be registered here:
  // fastify.register(productRoutes, { prefix: '/products' });
  // fastify.register(orderRoutes, { prefix: '/orders' });
}
