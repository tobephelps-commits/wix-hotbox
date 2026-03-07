import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type Database from 'better-sqlite3';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import type { Config } from '../config.js';
import vendorRoutes from './vendors.js';
import pipelineRoutes from './pipeline.js';
import logoRoutes from './logos.js';
import orderRoutes from './orders.js';
import monitorRoutes from './monitor.js';
import syncRoutes from './sync.js';

declare module 'fastify' {
  interface FastifyInstance {
    appVersion: string;
    db: Database.Database;
    config: Config;
  }
}

export default async function apiRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // Health check (lightweight, for monitoring)
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      version: fastify.appVersion,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  // System info (detailed, for dashboard)
  fastify.get('/system', async () => {
    const dbPath = join(fastify.config.dataDir, 'hotbox.db');

    // Database size in MB
    let dbSizeMB = 0;
    try {
      const stat = statSync(dbPath);
      dbSizeMB = Math.round((stat.size / (1024 * 1024)) * 100) / 100;
    } catch {
      // DB file may not exist yet
    }

    // Count applied migrations
    const migrationCount = (
      fastify.db.prepare('SELECT COUNT(*) as count FROM migrations').get() as { count: number }
    ).count;

    return {
      version: fastify.appVersion,
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      database: {
        path: dbPath,
        sizeMB: dbSizeMB,
        migrationsApplied: migrationCount,
      },
    };
  });

  // Vendor routes
  await fastify.register(vendorRoutes, { prefix: '/vendors' });

  // Pipeline routes (product preview, creation, presets, templates)
  await fastify.register(pipelineRoutes, { prefix: '/pipeline' });

  // Logo routes (registry, upload, overlay)
  await fastify.register(logoRoutes, { prefix: '/logos' });

  // Order routes (CRUD, status, sync, summary)
  await fastify.register(orderRoutes, { prefix: '/orders' });

  // Monitor routes (tracked products, snapshots, alerts, polling)
  await fastify.register(monitorRoutes, { prefix: '/monitor' });

  // Sync routes (product mappings, daemon control, WIX stock sync)
  await fastify.register(syncRoutes, { prefix: '/sync' });
}
