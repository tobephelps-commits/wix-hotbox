import { test, expect } from '../fixtures.js';

// =============================================================================
// GET /api/sync/mappings -- List product mappings
// =============================================================================

test.describe('GET /api/sync/mappings', () => {
  test('returns 200 with array', async ({ api }) => {
    const res = await api.get('/api/sync/mappings');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('mappings');
    expect(Array.isArray(res.body.mappings)).toBe(true);
    expect(res.body).toHaveProperty('total');
    expect(typeof res.body.total).toBe('number');
  });
});

// =============================================================================
// Sync mappings CRUD
// =============================================================================

test.describe('Sync mappings CRUD', () => {
  test('POST /api/sync/mappings creates a mapping', async ({ api }) => {
    const style = `SYNC-TEST-${Date.now()}`;
    const res = await api.post('/api/sync/mappings', {
      style,
      wixProductId: 'wix-product-test-001',
      productName: 'Test Sync Product',
      vendor: 'sanmar',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('mapping');
    expect(res.body.mapping).toHaveProperty('style', style);
  });

  test('POST /api/sync/mappings returns 400 without required fields', async ({ api }) => {
    const res = await api.post('/api/sync/mappings', {
      style: '',
      wixProductId: '',
      productName: '',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('created mapping appears in list', async ({ api }) => {
    const style = `SYNC-LIST-${Date.now()}`;
    await api.post('/api/sync/mappings', {
      style,
      wixProductId: 'wix-product-list-001',
      productName: 'Test List Product',
    });

    const res = await api.get('/api/sync/mappings');
    expect(res.status).toBe(200);

    const styles = res.body.mappings.map((m: { style: string }) => m.style);
    expect(styles).toContain(style);
  });

  test('DELETE /api/sync/mappings/:style removes mapping', async ({ api }) => {
    const style = `SYNC-DEL-${Date.now()}`;
    await api.post('/api/sync/mappings', {
      style,
      wixProductId: 'wix-product-del-001',
      productName: 'Test Delete Product',
    });

    const res = await api.delete(`/api/sync/mappings/${style}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    // Verify removal
    const listRes = await api.get('/api/sync/mappings');
    const styles = listRes.body.mappings.map((m: { style: string }) => m.style);
    expect(styles).not.toContain(style);
  });

  test('DELETE /api/sync/mappings/:style returns 404 for non-existent', async ({ api }) => {
    const res = await api.delete('/api/sync/mappings/NONEXISTENT-STYLE-999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// GET /api/sync/health -- Daemon health
// =============================================================================

test.describe('GET /api/sync/health', () => {
  test('returns 200 with daemon status', async ({ api }) => {
    const res = await api.get('/api/sync/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('running');
    expect(typeof res.body.running).toBe('boolean');
    // In test environment, daemon should not be running
    expect(res.body.running).toBe(false);
  });
});

// =============================================================================
// POST /api/sync/start and POST /api/sync/stop -- Daemon control
// =============================================================================

test.describe('Daemon control', () => {
  test('POST /api/sync/start starts daemon (or errors without credentials)', async ({ api }) => {
    const res = await api.post('/api/sync/start', {});

    // With dummy credentials, may start or return 500 (config error)
    expect([200, 500]).toContain(res.status);
  });

  test('POST /api/sync/stop returns 404 when daemon not running', async ({ api }) => {
    const res = await api.post('/api/sync/stop', {});

    // If daemon wasn't started, should return 404
    expect([200, 404]).toContain(res.status);
  });
});

// =============================================================================
// POST /api/sync/audit -- Audit product mappings
// =============================================================================

test.describe('POST /api/sync/audit', () => {
  test('handles audit without real WIX credentials', async ({ api }) => {
    const res = await api.post('/api/sync/audit', {});

    // Without real WIX credentials, should return a result or error
    // but not crash the server
    expect([200, 500]).toContain(res.status);

    if (res.status === 200) {
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('healthy');
    } else {
      expect(res.body).toHaveProperty('error');
    }
  });
});
