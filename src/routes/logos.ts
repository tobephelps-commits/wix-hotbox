/**
 * Logo API Routes
 *
 * Fastify plugin providing REST endpoints for logo management:
 * - GET  /api/logos                — List all logos and position presets
 * - POST /api/logos/upload         — Upload a new logo
 * - PUT  /api/logos/:name          — Update logo metadata
 * - DELETE /api/logos/:name        — Remove a logo
 * - GET  /api/logos/file/:name     — Serve logo PNG file
 * - POST /api/logos/overlay        — Generate overlay preview
 *
 * Phase 48: Logo System
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import * as fs from 'node:fs';
import {
  setDataDir,
  setUploadDataDir,
  loadLogoRegistry,
  getLogoEntry,
  updateLogo,
  removeLogo,
  resolveLogoPath,
  processLogoUpload,
  compositeLogoOnImage,
} from '../logo/index.js';
import type { LogoPosition, LogoRegistryEntry } from '../logo/types.js';

export default async function logoRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // Initialize logo service with configured dataDir
  setDataDir(fastify.config.dataDir);
  setUploadDataDir(fastify.config.dataDir);

  // Register raw body parser for image uploads
  fastify.addContentTypeParser(
    ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/octet-stream'],
    { parseAs: 'buffer' },
    (_req: any, body: Buffer, done: (err: null, body: Buffer) => void) => {
      done(null, body);
    },
  );

  // =========================================================================
  // GET / — List all logos and position presets
  // =========================================================================

  fastify.get('/', async () => {
    const registry = loadLogoRegistry();
    return {
      logos: registry.logos,
      positionPresets: registry.positionPresets,
    };
  });

  // =========================================================================
  // POST /upload — Upload a new logo
  // =========================================================================

  fastify.post<{
    Headers: { 'x-logo-key'?: string; 'x-logo-display-name'?: string };
  }>('/upload', async (request, reply) => {
    const key = request.headers['x-logo-key'] as string | undefined;
    const displayName = request.headers['x-logo-display-name'] as string | undefined;

    if (!key) {
      return reply.status(400).send({ error: 'Missing x-logo-key header' });
    }
    if (!displayName) {
      return reply.status(400).send({ error: 'Missing x-logo-display-name header' });
    }

    const buffer = request.body as Buffer;
    if (!buffer || buffer.length === 0) {
      return reply.status(400).send({ error: 'Empty request body' });
    }

    try {
      const entry = await processLogoUpload(buffer, key, key, displayName);
      return { ok: true, logo: { key, entry } };
    } catch (err) {
      return reply.status(400).send({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // =========================================================================
  // GET /file/:name — Serve logo PNG file
  // =========================================================================
  // NOTE: This must be registered BEFORE the parameterized PUT/DELETE /:name
  // routes to avoid "file" being captured as a :name param.

  fastify.get<{ Params: { name: string } }>(
    '/file/:name',
    async (request, reply) => {
      const { name } = request.params;

      try {
        const entry = getLogoEntry(name);
        const filePath = resolveLogoPath(entry);

        if (!fs.existsSync(filePath)) {
          return reply.status(404).send({ error: `Logo file not found on disk: ${name}` });
        }

        const fileBuffer = fs.readFileSync(filePath);
        return reply
          .header('content-type', 'image/png')
          .header('cache-control', 'public, max-age=3600')
          .send(fileBuffer);
      } catch (err) {
        return reply.status(404).send({
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // =========================================================================
  // POST /overlay — Generate overlay preview
  // =========================================================================

  fastify.post<{
    Body: {
      imageUrl: string;
      logoName: string;
      position: LogoPosition;
      scale?: number;
      opacity?: number;
      blendMode?: string;
    };
  }>('/overlay', async (request, reply) => {
    const { imageUrl, logoName, position, scale, opacity, blendMode } = request.body;

    if (!imageUrl || !logoName || !position) {
      return reply.status(400).send({
        error: 'Missing required fields: imageUrl, logoName, position',
      });
    }

    try {
      const result = await compositeLogoOnImage(imageUrl, {
        logoName,
        position,
        scale,
        opacity,
        blendMode,
      });

      return reply
        .header('content-type', 'image/jpeg')
        .send(result);
    } catch (err) {
      return reply.status(500).send({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // =========================================================================
  // PUT /:name — Update logo metadata
  // =========================================================================

  fastify.put<{
    Params: { name: string };
    Body: Partial<LogoRegistryEntry>;
  }>('/:name', async (request, reply) => {
    const { name } = request.params;
    const updates = request.body;

    try {
      const updated = updateLogo(name, updates);
      return { ok: true, logo: updated };
    } catch (err) {
      return reply.status(404).send({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // =========================================================================
  // DELETE /:name — Remove a logo (also deletes file)
  // =========================================================================

  fastify.delete<{ Params: { name: string } }>(
    '/:name',
    async (request, reply) => {
      const { name } = request.params;

      try {
        removeLogo(name, true);
        return { ok: true };
      } catch (err) {
        return reply.status(404).send({
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );
}
