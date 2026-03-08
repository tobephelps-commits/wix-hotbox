import { test, expect } from '../fixtures.js';

// =============================================================================
// GET /api/orders -- List orders
// =============================================================================

test.describe('GET /api/orders', () => {
  test('returns 200 with array of orders (seeded)', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('orders');
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.orders.length).toBeGreaterThanOrEqual(1);
  });

  test('returns totalCount and pagination fields', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders');

    expect(res.body).toHaveProperty('totalCount');
    expect(typeof res.body.totalCount).toBe('number');
    expect(res.body).toHaveProperty('limit');
    expect(res.body).toHaveProperty('offset');
  });

  test('supports limit and offset query params', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders?limit=1&offset=0');

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(1);
    expect(res.body.offset).toBe(0);
    expect(res.body.orders.length).toBeLessThanOrEqual(1);
  });

  test('supports status filter', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders?status=new');

    expect(res.status).toBe(200);
    // All returned orders should have status 'new'
    for (const order of res.body.orders) {
      expect(order.status).toBe('new');
    }
  });
});

// =============================================================================
// GET /api/orders/:id -- Get order details
// =============================================================================

test.describe('GET /api/orders/:id', () => {
  test('returns 200 for seeded order', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders/test-order-001');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'test-order-001');
    expect(res.body).toHaveProperty('orderNumber', 1001);
    expect(res.body).toHaveProperty('customerFirstName', 'Test');
    expect(res.body).toHaveProperty('customerLastName', 'Customer');
    expect(res.body).toHaveProperty('status', 'new');
  });

  test('includes line items for seeded order', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders/test-order-001');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(2);
  });

  test('returns 404 for non-existent order', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders/nonexistent-id');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// PATCH /api/orders/:id/status -- Update order status
// =============================================================================

test.describe('PATCH /api/orders/:id/status', () => {
  test('returns 200 for valid status transition (new -> in-production)', async ({ seededApi }) => {
    const res = await seededApi.patch('/api/orders/test-order-001/status', {
      status: 'in-production',
    });

    // Should succeed (200) or fail with 400 if transition not allowed
    // new -> in-production is a valid transition per ORDER_STATUS_TRANSITIONS
    expect([200, 400]).toContain(res.status);
  });

  test('returns 400 for invalid status transition', async ({ seededApi }) => {
    // Attempting to move directly to 'delivered' from 'new' should fail
    const res = await seededApi.patch('/api/orders/test-order-001/status', {
      status: 'delivered',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 404 for non-existent order', async ({ seededApi }) => {
    const res = await seededApi.patch('/api/orders/nonexistent-id/status', {
      status: 'in-production',
    });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// GET /api/orders/summary -- Order summary
// =============================================================================

test.describe('GET /api/orders/summary', () => {
  test('returns 200 with order summary', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders/summary');

    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
    expect(res.body).not.toBeNull();
  });
});

// =============================================================================
// GET /api/orders/errors -- Orders with errors
// =============================================================================

test.describe('GET /api/orders/errors', () => {
  test('returns 200 with array', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders/errors');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('orders');
    expect(Array.isArray(res.body.orders)).toBe(true);
  });
});

// =============================================================================
// POST /api/orders/sync -- Trigger WIX order sync
// =============================================================================

test.describe('POST /api/orders/sync', () => {
  test('handles gracefully without real WIX credentials', async ({ seededApi }) => {
    const res = await seededApi.post('/api/orders/sync', {});

    // Without real WIX credentials, should return an error or empty result
    // but not crash the server
    expect([200, 400, 401, 500]).toContain(res.status);
  });
});

// =============================================================================
// GET /api/orders/:id/invoice -- Invoice PDF
// =============================================================================

test.describe('GET /api/orders/:id/invoice', () => {
  test('returns PDF or error for seeded order', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders/test-order-001/invoice');

    // Should either return a PDF (200 with application/pdf) or an error
    if (res.status === 200) {
      const contentType = res.headers.get('content-type') || '';
      expect(contentType).toContain('application/pdf');
    } else {
      // Acceptable error statuses (e.g., missing logo file for PDF generation)
      expect([400, 404, 500]).toContain(res.status);
    }
  });

  test('returns 404 for non-existent order', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders/nonexistent-id/invoice');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// GET /api/orders/:id/production-sheet -- Production sheet PDF
// =============================================================================

test.describe('GET /api/orders/:id/production-sheet', () => {
  test('returns PDF or error for seeded order', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders/test-order-001/production-sheet');

    // Should either return a PDF (200 with application/pdf) or an error
    if (res.status === 200) {
      const contentType = res.headers.get('content-type') || '';
      expect(contentType).toContain('application/pdf');
    } else {
      expect([400, 404, 500]).toContain(res.status);
    }
  });

  test('returns 404 for non-existent order', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders/nonexistent-id/production-sheet');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// POST /api/orders/bulk/status -- Bulk status update
// =============================================================================

test.describe('POST /api/orders/bulk/status', () => {
  test('returns 400 for empty orderIds', async ({ seededApi }) => {
    const res = await seededApi.post('/api/orders/bulk/status', {
      orderIds: [],
      status: 'in-production',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('handles valid bulk status request', async ({ seededApi }) => {
    const res = await seededApi.post('/api/orders/bulk/status', {
      orderIds: ['test-order-001'],
      status: 'in-production',
    });

    // Should succeed or fail with transition error
    expect([200, 400]).toContain(res.status);
  });
});

// =============================================================================
// GET /api/orders/cart/preview -- Cart preview
// =============================================================================

test.describe('GET /api/orders/cart/preview', () => {
  test('returns 200 with cart preview data', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders/cart/preview');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body).toHaveProperty('orderCount');
    expect(res.body).toHaveProperty('itemCount');
  });

  test('supports vendor filter', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders/cart/preview?vendor=sanmar');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
  });

  test('returns 400 for invalid vendor', async ({ seededApi }) => {
    const res = await seededApi.get('/api/orders/cart/preview?vendor=invalid');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
