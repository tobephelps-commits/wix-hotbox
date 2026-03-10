import { test, expect } from '../fixtures.js';

// =============================================================================
// GET /api/notifications/templates -- List templates
// =============================================================================

test.describe('GET /api/notifications/templates', () => {
  test('returns 200 with templates array', async ({ seededApi }) => {
    const res = await seededApi.get('/api/notifications/templates');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('templates');
    expect(Array.isArray(res.body.templates)).toBe(true);
    // Migration 007 seeds 5 default templates (3 email + 2 sms)
    expect(res.body.templates.length).toBeGreaterThanOrEqual(5);
  });

  test('templates have expected shape', async ({ seededApi }) => {
    const res = await seededApi.get('/api/notifications/templates');
    const template = res.body.templates[0];

    expect(template).toHaveProperty('id');
    expect(template).toHaveProperty('stage');
    expect(template).toHaveProperty('channel');
    expect(template).toHaveProperty('enabled');
    expect(template).toHaveProperty('bodyTemplate');
    expect(template).toHaveProperty('createdAt');
    expect(template).toHaveProperty('updatedAt');
  });
});

// =============================================================================
// GET /api/notifications/templates/:id -- Get single template
// =============================================================================

test.describe('GET /api/notifications/templates/:id', () => {
  test('returns single template by ID', async ({ seededApi }) => {
    // First get list to find a valid ID
    const listRes = await seededApi.get('/api/notifications/templates');
    const firstTemplate = listRes.body.templates[0];

    const res = await seededApi.get(`/api/notifications/templates/${firstTemplate.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', firstTemplate.id);
    expect(res.body).toHaveProperty('stage', firstTemplate.stage);
    expect(res.body).toHaveProperty('channel', firstTemplate.channel);
  });

  test('returns 404 for non-existent template', async ({ api }) => {
    const res = await api.get('/api/notifications/templates/99999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 for invalid template ID', async ({ api }) => {
    const res = await api.get('/api/notifications/templates/abc');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// POST /api/notifications/templates -- Create template
// =============================================================================

test.describe('POST /api/notifications/templates', () => {
  test('creates template with valid stage and channel', async ({ api }) => {
    const res = await api.post('/api/notifications/templates', {
      stage: 'packed',
      channel: 'email',
      subject: 'Order #{{orderNumber}} Packed',
      bodyTemplate: 'Your order #{{orderNumber}} has been packed and is ready to ship.',
      enabled: true,
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('stage', 'packed');
    expect(res.body).toHaveProperty('channel', 'email');
    expect(res.body).toHaveProperty('enabled', true);
    expect(res.body).toHaveProperty('subject', 'Order #{{orderNumber}} Packed');
    expect(res.body).toHaveProperty('bodyTemplate');
  });

  test('returns 400 for invalid stage', async ({ api }) => {
    const res = await api.post('/api/notifications/templates', {
      stage: 'invalid-stage',
      channel: 'email',
      bodyTemplate: 'Test body',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('Invalid stage');
  });

  test('returns 400 for invalid channel', async ({ api }) => {
    const res = await api.post('/api/notifications/templates', {
      stage: 'new',
      channel: 'pigeon',
      bodyTemplate: 'Test body',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('Channel');
  });

  test('returns 400 when bodyTemplate is missing', async ({ api }) => {
    const res = await api.post('/api/notifications/templates', {
      stage: 'new',
      channel: 'email',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 409 for duplicate stage+channel', async ({ seededApi }) => {
    // 'ordered'+'email' already exists from migration seeds
    const res = await seededApi.post('/api/notifications/templates', {
      stage: 'ordered',
      channel: 'email',
      bodyTemplate: 'Duplicate template attempt',
    });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('already exists');
  });
});

// =============================================================================
// PATCH /api/notifications/templates/:id -- Update template
// =============================================================================

test.describe('PATCH /api/notifications/templates/:id', () => {
  test('updates template fields', async ({ seededApi }) => {
    // Get a template to update
    const listRes = await seededApi.get('/api/notifications/templates');
    const template = listRes.body.templates[0];

    const res = await seededApi.patch(`/api/notifications/templates/${template.id}`, {
      subject: 'Updated Subject',
      enabled: false,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('subject', 'Updated Subject');
    expect(res.body).toHaveProperty('enabled', false);
    expect(res.body).toHaveProperty('id', template.id);
  });

  test('returns 404 for non-existent template', async ({ api }) => {
    const res = await api.patch('/api/notifications/templates/99999', {
      subject: 'Does not exist',
    });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 for invalid template ID', async ({ api }) => {
    const res = await api.patch('/api/notifications/templates/abc', {
      subject: 'Invalid ID',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// DELETE /api/notifications/templates/:id -- Delete template
// =============================================================================

test.describe('DELETE /api/notifications/templates/:id', () => {
  test('deletes template and returns 204', async ({ api }) => {
    // Create a template to delete
    const createRes = await api.post('/api/notifications/templates', {
      stage: 'in-production',
      channel: 'sms',
      bodyTemplate: 'HotBox: Order #{{orderNumber}} in production',
    });
    expect(createRes.status).toBe(201);
    const templateId = createRes.body.id;

    // Delete it
    const res = await api.delete(`/api/notifications/templates/${templateId}`);
    expect(res.status).toBe(204);

    // Verify gone
    const getRes = await api.get(`/api/notifications/templates/${templateId}`);
    expect(getRes.status).toBe(404);
  });

  test('returns 404 for non-existent template', async ({ api }) => {
    const res = await api.delete('/api/notifications/templates/99999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// GET /api/notifications/log -- Notification history
// =============================================================================

test.describe('GET /api/notifications/log', () => {
  test('returns log entries with pagination', async ({ seededApi }) => {
    const res = await seededApi.get('/api/notifications/log');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('entries');
    expect(res.body).toHaveProperty('totalCount');
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
  });

  test('log entries have expected shape', async ({ seededApi }) => {
    const res = await seededApi.get('/api/notifications/log');
    const entry = res.body.entries[0];

    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('orderId');
    expect(entry).toHaveProperty('channel');
    expect(entry).toHaveProperty('recipient');
    expect(entry).toHaveProperty('body');
    expect(entry).toHaveProperty('status');
    expect(entry).toHaveProperty('createdAt');
  });

  test('supports channel filter', async ({ seededApi }) => {
    const res = await seededApi.get('/api/notifications/log?channel=email');

    expect(res.status).toBe(200);
    for (const entry of res.body.entries) {
      expect(entry.channel).toBe('email');
    }
  });

  test('supports status filter', async ({ seededApi }) => {
    const res = await seededApi.get('/api/notifications/log?status=sent');

    expect(res.status).toBe(200);
    for (const entry of res.body.entries) {
      expect(entry.status).toBe('sent');
    }
  });

  test('supports pagination with limit and offset', async ({ seededApi }) => {
    const res = await seededApi.get('/api/notifications/log?limit=1&offset=0');

    expect(res.status).toBe(200);
    expect(res.body.entries.length).toBeLessThanOrEqual(1);
    expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
  });
});

// =============================================================================
// GET /api/notifications/log/order/:orderId -- Order-specific log entries
// =============================================================================

test.describe('GET /api/notifications/log/order/:orderId', () => {
  test('returns log entries for seeded order', async ({ seededApi }) => {
    // Our seeded log entries use order_id = 1001 (matching seeded order_number)
    const res = await seededApi.get('/api/notifications/log/order/1001');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('entries');
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries.length).toBeGreaterThanOrEqual(2);
  });

  test('returns empty entries for order with no notifications', async ({ seededApi }) => {
    const res = await seededApi.get('/api/notifications/log/order/99999');

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(0);
  });
});

// =============================================================================
// POST /api/notifications/test -- Send test notification
// =============================================================================

test.describe('POST /api/notifications/test', () => {
  test('returns structured error without SMTP config (not 500)', async ({ seededApi }) => {
    // Get a valid template ID
    const listRes = await seededApi.get('/api/notifications/templates');
    const emailTemplate = listRes.body.templates.find((t: any) => t.channel === 'email');

    const res = await seededApi.post('/api/notifications/test', {
      templateId: emailTemplate.id,
      channel: 'email',
      recipient: 'test@example.com',
    });

    // Should return a result (may succeed or fail depending on SMTP config)
    // but should NOT be a 500 crash
    expect(res.status).not.toBe(500);
    expect(res.body).toHaveProperty('success');
  });

  test('returns 400 when required fields are missing', async ({ api }) => {
    const res = await api.post('/api/notifications/test', {
      channel: 'email',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 404 for non-existent template', async ({ api }) => {
    const res = await api.post('/api/notifications/test', {
      templateId: 99999,
      channel: 'email',
      recipient: 'test@example.com',
    });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
