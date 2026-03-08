import { test, expect } from '../fixtures.js';

// =============================================================================
// POST /api/printing/discover -- Discover printers on LAN
// =============================================================================

test.describe('POST /api/printing/discover', () => {
  test('returns 200 with printers array (may be empty)', async ({ api }) => {
    const res = await api.post('/api/printing/discover', { timeout: 1000 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('printers');
    expect(Array.isArray(res.body.printers)).toBe(true);
    expect(res.body).toHaveProperty('count');
    expect(typeof res.body.count).toBe('number');
  });
});

// =============================================================================
// GET /api/printing/saved -- List saved printers
// =============================================================================

test.describe('GET /api/printing/saved', () => {
  test('returns 200 with empty printers array initially', async ({ api }) => {
    const res = await api.get('/api/printing/saved');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('printers');
    expect(Array.isArray(res.body.printers)).toBe(true);
  });
});

// =============================================================================
// POST /api/printing/saved -- Save a printer config
// =============================================================================

test.describe('POST /api/printing/saved', () => {
  test('saves a printer config and returns 201', async ({ api }) => {
    const res = await api.post('/api/printing/saved', {
      id: 'test-printer-001',
      uri: 'ipp://192.168.1.100:631/ipp/print',
      name: 'Test Printer',
      model: 'Generic Printer',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 'test-printer-001');
    expect(res.body).toHaveProperty('uri');
  });

  test('returns 400 when id is missing', async ({ api }) => {
    const res = await api.post('/api/printing/saved', {
      uri: 'ipp://192.168.1.100:631/ipp/print',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when uri is missing', async ({ api }) => {
    const res = await api.post('/api/printing/saved', {
      id: 'no-uri-printer',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// GET /api/printing/saved (after save) -- Saved printer appears
// =============================================================================

test.describe('Saved printer lifecycle', () => {
  test('saved printer appears in listing', async ({ api }) => {
    // Save a printer
    const saveRes = await api.post('/api/printing/saved', {
      id: 'lifecycle-printer',
      uri: 'ipp://10.0.0.1:631/ipp/print',
      name: 'Lifecycle Printer',
    });
    expect(saveRes.status).toBe(201);

    // List
    const listRes = await api.get('/api/printing/saved');
    expect(listRes.status).toBe(200);
    const ids = listRes.body.printers.map((p: any) => p.id);
    expect(ids).toContain('lifecycle-printer');
  });
});

// =============================================================================
// PUT /api/printing/default/:id -- Set default printer
// =============================================================================

test.describe('PUT /api/printing/default/:id', () => {
  test('sets default printer for saved printer', async ({ api }) => {
    // First save a printer
    await api.post('/api/printing/saved', {
      id: 'default-test',
      uri: 'ipp://10.0.0.2:631/ipp/print',
      name: 'Default Test',
    });

    const res = await api.put('/api/printing/default/default-test');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('defaultPrinterId', 'default-test');
  });

  test('returns 404 for non-existent printer', async ({ api }) => {
    const res = await api.put('/api/printing/default/nonexistent-printer');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// DELETE /api/printing/saved/:id -- Remove saved printer
// =============================================================================

test.describe('DELETE /api/printing/saved/:id', () => {
  test('removes saved printer and returns 204', async ({ api }) => {
    // Save first
    await api.post('/api/printing/saved', {
      id: 'delete-test',
      uri: 'ipp://10.0.0.3:631/ipp/print',
      name: 'Delete Me',
    });

    const res = await api.delete('/api/printing/saved/delete-test');
    expect(res.status).toBe(204);

    // Verify gone
    const listRes = await api.get('/api/printing/saved');
    const ids = listRes.body.printers.map((p: any) => p.id);
    expect(ids).not.toContain('delete-test');
  });

  test('returns 404 for non-existent printer', async ({ api }) => {
    const res = await api.delete('/api/printing/saved/nonexistent-printer');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// POST /api/printing/print -- Print a document (error case)
// =============================================================================

test.describe('POST /api/printing/print', () => {
  test('returns 400 when printerUri is missing', async ({ api }) => {
    const res = await api.post('/api/printing/print', {
      documentBuffer: Buffer.from('fake pdf').toString('base64'),
      documentName: 'test.pdf',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when documentBuffer is missing', async ({ api }) => {
    const res = await api.post('/api/printing/print', {
      printerUri: 'ipp://192.168.1.100:631/ipp/print',
      documentName: 'test.pdf',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns response for unreachable printer URI (not crash)', async ({ api }) => {
    const res = await api.post('/api/printing/print', {
      printerUri: 'ipp://192.168.99.99:631/ipp/print',
      documentBuffer: Buffer.from('fake pdf content').toString('base64'),
      documentName: 'test.pdf',
    });

    // Should handle gracefully — either an error status or a 200 with error info
    expect([200, 400, 500, 502]).toContain(res.status);
    expect(res.body).toBeDefined();
  });
});

// =============================================================================
// POST /api/printing/printers/test -- Test printer connectivity
// =============================================================================

test.describe('POST /api/printing/printers/test', () => {
  test('returns error for unreachable URI (not crash)', async ({ api }) => {
    const res = await api.post('/api/printing/printers/test', {
      uri: 'ipp://192.168.99.99:631/ipp/print',
    });

    // Should handle gracefully — either success shape or error
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reachable');
  });

  test('returns 400 when uri is missing', async ({ api }) => {
    const res = await api.post('/api/printing/printers/test', {});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
