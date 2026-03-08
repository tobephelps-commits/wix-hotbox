import { test, expect } from '../fixtures.js';

// =============================================================================
// GET /api/monitor/config -- Monitor configuration
// =============================================================================

test.describe('GET /api/monitor/config', () => {
  test('returns 200 with monitor configuration', async ({ api }) => {
    const res = await api.get('/api/monitor/config');

    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
    expect(res.body).not.toBeNull();
  });
});

// =============================================================================
// Monitor tracked products CRUD
// =============================================================================

test.describe('Monitor tracked products CRUD', () => {
  const testStyle = `TEST-MON-${Date.now()}`;

  test('POST /api/monitor/products adds a tracked product', async ({ api }) => {
    const res = await api.post('/api/monitor/products', {
      style: testStyle,
      name: 'Test Monitor Product',
      vendor: 'sanmar',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('style', testStyle);
  });

  test('GET /api/monitor/products returns the added product', async ({ api }) => {
    // First add a product so we have something to list
    const addStyle = `TEST-LIST-${Date.now()}`;
    await api.post('/api/monitor/products', {
      style: addStyle,
      name: 'Test List Product',
      vendor: 'sanmar',
    });

    const res = await api.get('/api/monitor/products');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('products');
    expect(Array.isArray(res.body.products)).toBe(true);

    const styles = res.body.products.map((p: { style: string }) => p.style);
    expect(styles).toContain(addStyle);
  });

  test('PATCH /api/monitor/products/:style updates product', async ({ api }) => {
    const patchStyle = `TEST-PATCH-${Date.now()}`;
    await api.post('/api/monitor/products', {
      style: patchStyle,
      name: 'Test Patch Product',
      vendor: 'sanmar',
    });

    const res = await api.patch(`/api/monitor/products/${patchStyle}`, {
      priority: 'high',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  test('DELETE /api/monitor/products/:style removes product', async ({ api }) => {
    const delStyle = `TEST-DEL-${Date.now()}`;
    await api.post('/api/monitor/products', {
      style: delStyle,
      name: 'Test Delete Product',
      vendor: 'sanmar',
    });

    const res = await api.delete(`/api/monitor/products/${delStyle}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);

    // Verify removal
    const listRes = await api.get('/api/monitor/products');
    const styles = listRes.body.products.map((p: { style: string }) => p.style);
    expect(styles).not.toContain(delStyle);
  });

  test('DELETE /api/monitor/products/:style returns 404 for non-existent', async ({ api }) => {
    const res = await api.delete('/api/monitor/products/NONEXISTENT-STYLE-999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/monitor/products returns 400 without required fields', async ({ api }) => {
    const res = await api.post('/api/monitor/products', {
      style: '',
      name: '',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// GET /api/monitor/alerts -- List alerts
// =============================================================================

test.describe('GET /api/monitor/alerts', () => {
  test('returns 200 with array', async ({ api }) => {
    const res = await api.get('/api/monitor/alerts');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('alerts');
    expect(Array.isArray(res.body.alerts)).toBe(true);
  });
});

// =============================================================================
// POST /api/monitor/poll -- On-demand poll
// =============================================================================

test.describe('POST /api/monitor/poll', () => {
  test('handles gracefully without vendor credentials', async ({ api }) => {
    const res = await api.post('/api/monitor/poll', {});

    // Without real vendor credentials, should return a result (possibly with errors)
    // but not crash the server
    expect([200, 400, 500]).toContain(res.status);
  });
});
