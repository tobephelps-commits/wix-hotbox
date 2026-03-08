import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { FastifyInstance } from 'fastify';

export interface TestServer {
  app: FastifyInstance;
  baseUrl: string;
  dataDir: string;
  cleanup: () => Promise<void>;
}

/**
 * Start a test server instance with an isolated temp data directory.
 * Sets dummy credentials so the app boots without real vendor APIs.
 */
/**
 * Get a random available port in the ephemeral range.
 * Uses a random offset to avoid collisions between parallel workers.
 */
function randomPort(): number {
  return 10000 + Math.floor(Math.random() * 50000);
}

export async function startTestServer(port?: number): Promise<TestServer> {
  const listenPort = port ?? randomPort();
  const dataDir = mkdtempSync(join(tmpdir(), 'hotbox-test-'));
  const logDir = join(dataDir, 'logs');
  mkdirSync(logDir, { recursive: true });

  // Set env vars before importing app modules (they read process.env at import time)
  process.env.PORT = String(listenPort);
  process.env.DATA_DIR = dataDir;
  process.env.NODE_ENV = 'test';
  process.env.LOG_DIR = logDir;
  process.env.HOST = '127.0.0.1';

  // Set dummy credentials so the app boots without real vendor APIs
  process.env.WIX_API_KEY = process.env.WIX_API_KEY || 'test-dummy-key';
  process.env.WIX_SITE_ID = process.env.WIX_SITE_ID || 'test-dummy-site';

  // Dynamic import to pick up env vars
  const { loadConfig } = await import('../../src/config.js');
  const { createDatabase, runMigrations } = await import('../../src/db/index.js');
  const { buildApp } = await import('../../src/app.js');

  const config = loadConfig();
  const db = createDatabase(config);
  runMigrations(db);

  const app = await buildApp(config, db);
  await app.listen({ port: listenPort, host: '127.0.0.1' });

  // Resolve the actual port
  const address = app.server.address();
  const actualPort = typeof address === 'object' && address ? address.port : listenPort;
  const baseUrl = `http://127.0.0.1:${actualPort}`;

  const cleanup = async () => {
    await app.close();
    db.close();
    try {
      rmSync(dataDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  };

  return { app, baseUrl, dataDir, cleanup };
}
