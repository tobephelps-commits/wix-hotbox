import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type Database from 'better-sqlite3';
import { statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import type { Config } from '../config.js';
import vendorRoutes from './vendors.js';
import pipelineRoutes from './pipeline.js';
import logoRoutes from './logos.js';
import orderRoutes from './orders.js';
import monitorRoutes from './monitor.js';
import syncRoutes from './sync.js';
import customerRoutes from './customers.js';
import printingRoutes from './printing.js';
import wixContactRoutes from './wix-contacts.js';
import { getNetworkInfo } from '../lan/index.js';

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

    // CPU info
    const cpu = {
      loadAvg: os.loadavg(),
      cores: os.cpus().length,
    };

    // Memory info
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memory = {
      totalMB: Math.round(totalMem / (1024 * 1024)),
      freeMB: Math.round(freeMem / (1024 * 1024)),
      usedPercent: Math.round((1 - freeMem / totalMem) * 100),
    };

    // CPU temperature (Pi only — reads thermal zone)
    let temperature: number | null = null;
    try {
      const raw = readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf-8');
      temperature = parseInt(raw.trim(), 10) / 1000;
    } catch {
      // Not a Pi or thermal zone unavailable
    }

    // Disk usage (Linux only — parse df output)
    let disk: { totalMB: number; usedMB: number; availableMB: number; usedPercent: number } | null = null;
    if (process.platform === 'linux') {
      try {
        const dfOutput = execSync('df -B1 /home/hotbox/app/data 2>/dev/null', { encoding: 'utf-8' });
        const lines = dfOutput.trim().split('\n');
        if (lines.length >= 2) {
          const cols = lines[1].split(/\s+/);
          const totalBytes = parseInt(cols[1], 10);
          const usedBytes = parseInt(cols[2], 10);
          const availBytes = parseInt(cols[3], 10);
          disk = {
            totalMB: Math.round(totalBytes / (1024 * 1024)),
            usedMB: Math.round(usedBytes / (1024 * 1024)),
            availableMB: Math.round(availBytes / (1024 * 1024)),
            usedPercent: Math.round((usedBytes / totalBytes) * 100),
          };
        }
      } catch {
        // df not available or path doesn't exist
      }
    }

    // Network info
    const network = getNetworkInfo(fastify.config.port);

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
      cpu,
      memory,
      temperature,
      disk,
      network,
    };
  });

  // Network info (LAN access details for dashboard)
  fastify.get('/network', async () => {
    return getNetworkInfo(fastify.config.port);
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

  // Customer routes (CRUD, pricing, royalty reports, PDF statements)
  await fastify.register(customerRoutes, { prefix: '/customers' });

  // Printing routes (printer discovery, saved printers, print jobs)
  await fastify.register(printingRoutes, { prefix: '/printing' });

  // WIX Contacts routes (sync control, contact queries, customer linking)
  await fastify.register(wixContactRoutes, { prefix: '/wix-contacts' });
}
