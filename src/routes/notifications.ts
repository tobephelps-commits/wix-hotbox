/**
 * Notification API Routes
 *
 * Fastify plugin providing REST endpoints for notification management:
 * - GET    /api/notifications/templates          -- List all templates
 * - GET    /api/notifications/templates/:id      -- Get single template
 * - POST   /api/notifications/templates          -- Create template
 * - PATCH  /api/notifications/templates/:id      -- Update template
 * - DELETE /api/notifications/templates/:id      -- Delete template
 * - GET    /api/notifications/log                -- View notification history
 * - GET    /api/notifications/log/order/:orderId -- Notifications for an order
 * - POST   /api/notifications/test               -- Send test notification
 *
 * Phase 61: Notification System
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { OrderStatus } from '../orders/types.js';
import { ORDER_STATUSES } from '../orders/types.js';
import type { NotificationConfig } from '../sync/types.js';
import type {
  NotificationChannel,
  NotificationStatus,
  CreateTemplateInput,
  UpdateTemplateInput,
  NotificationContext,
  SendResult,
} from '../notifications/types.js';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getNotificationLog,
  getLogForOrder,
} from '../notifications/store.js';
import { sendOrderEmail } from '../notifications/email-sender.js';
import { sendOrderSms } from '../notifications/sms-sender.js';

// =============================================================================
// Helper: Build NotificationConfig from env
// =============================================================================

function getNotificationConfig(): NotificationConfig {
  const smtpUser = process.env.SMTP_USER ?? '';
  const smtpPass = process.env.SMTP_PASS ?? '';
  const enabled = Boolean(smtpUser);

  return {
    enabled,
    smtp: {
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: (process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
      user: smtpUser,
      pass: smtpPass,
    },
    to: '', // Not used for customer emails (recipient comes from order)
    from: process.env.NOTIFY_FROM ?? smtpUser ?? 'noreply@hotboxclothing.com',
  };
}

// =============================================================================
// Routes Plugin
// =============================================================================

export default async function notificationRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // =========================================================================
  // GET /templates -- List all notification templates
  // =========================================================================

  fastify.get('/templates', async () => {
    const templates = listTemplates(fastify.db);
    return { templates };
  });

  // =========================================================================
  // GET /templates/:id -- Get single template
  // =========================================================================

  fastify.get<{ Params: { id: string } }>('/templates/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid template ID' });
    }

    const template = getTemplate(fastify.db, id);
    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }
    return template;
  });

  // =========================================================================
  // POST /templates -- Create new template
  // =========================================================================

  fastify.post<{
    Body: {
      stage: string;
      channel: string;
      subject?: string;
      bodyTemplate: string;
      enabled?: boolean;
    };
  }>('/templates', async (request, reply) => {
    const { stage, channel, subject, bodyTemplate, enabled } = request.body;

    // Validate stage
    if (!stage || !ORDER_STATUSES.includes(stage as OrderStatus)) {
      return reply.status(400).send({
        error: `Invalid stage. Must be one of: ${ORDER_STATUSES.join(', ')}`,
      });
    }

    // Validate channel
    if (!channel || (channel !== 'email' && channel !== 'sms')) {
      return reply.status(400).send({ error: 'Channel must be "email" or "sms"' });
    }

    // Validate bodyTemplate
    if (!bodyTemplate || bodyTemplate.trim() === '') {
      return reply.status(400).send({ error: 'bodyTemplate is required' });
    }

    const input: CreateTemplateInput = {
      stage,
      channel: channel as NotificationChannel,
      subject,
      bodyTemplate,
      enabled,
    };

    try {
      const template = createTemplate(fastify.db, input);
      return reply.status(201).send(template);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // UNIQUE constraint violation = template already exists for this stage+channel
      if (message.includes('UNIQUE constraint')) {
        return reply.status(409).send({
          error: `Template already exists for stage "${stage}" and channel "${channel}"`,
        });
      }
      return reply.status(500).send({ error: message });
    }
  });

  // =========================================================================
  // PATCH /templates/:id -- Update template
  // =========================================================================

  fastify.patch<{
    Params: { id: string };
    Body: { subject?: string; bodyTemplate?: string; enabled?: boolean };
  }>('/templates/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid template ID' });
    }

    const { subject, bodyTemplate, enabled } = request.body;

    const input: UpdateTemplateInput = {};
    if (subject !== undefined) input.subject = subject;
    if (bodyTemplate !== undefined) input.bodyTemplate = bodyTemplate;
    if (enabled !== undefined) input.enabled = enabled;

    const template = updateTemplate(fastify.db, id, input);
    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }
    return template;
  });

  // =========================================================================
  // DELETE /templates/:id -- Delete template
  // =========================================================================

  fastify.delete<{ Params: { id: string } }>('/templates/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid template ID' });
    }

    const deleted = deleteTemplate(fastify.db, id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Template not found' });
    }
    return reply.status(204).send();
  });

  // =========================================================================
  // GET /log -- View notification history (paginated, filterable)
  // =========================================================================

  fastify.get<{
    Querystring: {
      orderId?: string;
      channel?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };
  }>('/log', async (request) => {
    const { orderId, channel, status, limit: limitStr, offset: offsetStr } = request.query;

    const filter: {
      orderId?: number;
      channel?: NotificationChannel;
      status?: NotificationStatus;
      limit?: number;
      offset?: number;
    } = {};

    if (orderId) filter.orderId = parseInt(orderId, 10);
    if (channel === 'email' || channel === 'sms') filter.channel = channel;
    if (status === 'pending' || status === 'sent' || status === 'failed') filter.status = status;
    if (limitStr) filter.limit = parseInt(limitStr, 10);
    if (offsetStr) filter.offset = parseInt(offsetStr, 10);

    return getNotificationLog(fastify.db, filter);
  });

  // =========================================================================
  // GET /log/order/:orderId -- All notifications for an order
  // =========================================================================

  fastify.get<{ Params: { orderId: string } }>('/log/order/:orderId', async (request) => {
    const orderId = parseInt(request.params.orderId, 10);
    const entries = getLogForOrder(fastify.db, orderId);
    return { entries };
  });

  // =========================================================================
  // POST /test -- Send a test notification
  // =========================================================================

  fastify.post<{
    Body: { templateId: number; channel: 'email' | 'sms'; recipient: string };
  }>('/test', async (request, reply) => {
    const { templateId, channel, recipient } = request.body;

    if (!templateId || !channel || !recipient) {
      return reply.status(400).send({
        error: 'templateId, channel, and recipient are required',
      });
    }

    // Look up template
    const template = getTemplate(fastify.db, templateId);
    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    // Build dummy context for testing
    const context: NotificationContext = {
      orderNumber: 'TEST-001',
      customerName: 'Test Customer',
      customerEmail: channel === 'email' ? recipient : undefined,
      customerPhone: channel === 'sms' ? recipient : undefined,
      status: template.stage,
      storeName: 'HotBox Clothing',
    };

    let result: SendResult;

    if (channel === 'email') {
      const notificationConfig = getNotificationConfig();
      result = await sendOrderEmail(notificationConfig, fastify.db, 0, template, context);
    } else if (channel === 'sms') {
      result = await sendOrderSms(fastify.config, fastify.db, 0, template, context);
    } else {
      return reply.status(400).send({ error: 'Channel must be "email" or "sms"' });
    }

    return result;
  });
}
