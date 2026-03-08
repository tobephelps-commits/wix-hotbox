import { test, expect } from '../fixtures.js';

// Minimal valid 1x1 transparent PNG (68 bytes)
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TINY_PNG = Buffer.from(TINY_PNG_BASE64, 'base64');

// =============================================================================
// GET /api/logos -- List logos
// =============================================================================

test.describe('GET /api/logos', () => {
  test('returns 200 with logos array and positionPresets', async ({ api }) => {
    const res = await api.get('/api/logos');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('logos');
    expect(res.body).toHaveProperty('positionPresets');
  });
});

// =============================================================================
// POST /api/logos/upload -- Upload a logo
// =============================================================================

test.describe('POST /api/logos/upload', () => {
  test('uploads a small PNG and returns success', async ({ api }) => {
    const res = await api.postRaw('/api/logos/upload', TINY_PNG, 'image/png', {
      'x-logo-key': 'test-upload',
      'x-logo-display-name': 'Test Upload Logo',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('logo');
    expect(res.body.logo).toHaveProperty('key', 'test-upload');
  });

  test('returns 400 when x-logo-key header is missing', async ({ api }) => {
    const res = await api.postRaw('/api/logos/upload', TINY_PNG, 'image/png', {
      'x-logo-display-name': 'Missing Key',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when x-logo-display-name header is missing', async ({ api }) => {
    const res = await api.postRaw('/api/logos/upload', TINY_PNG, 'image/png', {
      'x-logo-key': 'no-display',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// GET /api/logos (after upload) -- List includes uploaded logo
// =============================================================================

test.describe('Logo upload + list cycle', () => {
  test('uploaded logo appears in listing', async ({ api }) => {
    // Upload
    const uploadRes = await api.postRaw('/api/logos/upload', TINY_PNG, 'image/png', {
      'x-logo-key': 'cycle-test',
      'x-logo-display-name': 'Cycle Test',
    });
    expect(uploadRes.status).toBe(200);

    // List
    const listRes = await api.get('/api/logos');
    expect(listRes.status).toBe(200);

    const logos = listRes.body.logos;
    expect(typeof logos).toBe('object');
    // The logo should exist in the registry (keyed by name)
    expect(logos).toHaveProperty('cycle-test');
  });
});

// =============================================================================
// GET /api/logos/file/:name -- Serve logo image
// =============================================================================

test.describe('GET /api/logos/file/:name', () => {
  test('serves uploaded logo image', async ({ api }) => {
    // Upload first
    await api.postRaw('/api/logos/upload', TINY_PNG, 'image/png', {
      'x-logo-key': 'serve-test',
      'x-logo-display-name': 'Serve Test',
    });

    const res = await api.get('/api/logos/file/serve-test');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/png');
  });

  test('returns 404 for non-existent logo', async ({ api }) => {
    const res = await api.get('/api/logos/file/nonexistent-logo');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// PUT /api/logos/:name -- Update logo metadata
// =============================================================================

test.describe('PUT /api/logos/:name', () => {
  test('updates logo metadata', async ({ api }) => {
    // Upload first
    await api.postRaw('/api/logos/upload', TINY_PNG, 'image/png', {
      'x-logo-key': 'update-test',
      'x-logo-display-name': 'Update Test',
    });

    const res = await api.put('/api/logos/update-test', {
      displayName: 'Updated Name',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  test('returns 404 for non-existent logo', async ({ api }) => {
    const res = await api.put('/api/logos/nonexistent-logo', {
      displayName: 'Nope',
    });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// DELETE /api/logos/:name -- Remove logo
// =============================================================================

test.describe('DELETE /api/logos/:name', () => {
  test('deletes uploaded logo', async ({ api }) => {
    // Upload first
    await api.postRaw('/api/logos/upload', TINY_PNG, 'image/png', {
      'x-logo-key': 'delete-test',
      'x-logo-display-name': 'Delete Test',
    });

    const res = await api.delete('/api/logos/delete-test');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);

    // Verify it's gone from file serving
    const getRes = await api.get('/api/logos/file/delete-test');
    expect(getRes.status).toBe(404);
  });

  test('returns 404 for non-existent logo', async ({ api }) => {
    const res = await api.delete('/api/logos/nonexistent-logo');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
