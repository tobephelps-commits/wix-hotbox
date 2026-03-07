import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from './config.js';

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
  });

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

  // Health endpoint
  const version = getVersion();
  app.get('/api/health', async () => {
    return {
      status: 'ok',
      version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}
