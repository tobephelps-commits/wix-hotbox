import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from './config.js';
import apiRoutes from './routes/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
    );
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function buildApp(config: Config) {
  const app = Fastify({
    logger: config.nodeEnv === 'production'
      ? true
      : { level: 'info' },
    requestIdLogLabel: 'reqId',
  });

  // Decorate with app version for routes to use
  app.decorate('appVersion', getVersion());

  // CORS — allow any origin (LAN access from any device)
  await app.register(cors, { origin: true });

  // Global error handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({
      error: error.message || 'Internal Server Error',
      statusCode,
    });
  });

  // Custom 404 handler
  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      statusCode: 404,
    });
  });

  // Request timing logs in development mode
  if (config.nodeEnv !== 'production') {
    app.addHook('onRequest', async (request) => {
      (request as any).startTime = performance.now();
    });

    app.addHook('onResponse', async (request, reply) => {
      const startTime = (request as any).startTime as number | undefined;
      if (startTime !== undefined) {
        const duration = (performance.now() - startTime).toFixed(2);
        request.log.info(
          { method: request.method, url: request.url, statusCode: reply.statusCode, responseTimeMs: duration },
          'request completed',
        );
      }
    });
  }

  // API routes
  await app.register(apiRoutes, { prefix: '/api' });

  return app;
}
