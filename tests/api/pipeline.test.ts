import { test, expect } from '../fixtures.js';

test.describe('GET /api/pipeline/presets', () => {
  test('returns 200 with pricing presets object', async ({ api }) => {
    const res = await api.get('/api/pipeline/presets');

    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
    expect(res.body).not.toBeNull();
  });

  test('includes standard-tee preset with expected shape', async ({ api }) => {
    const res = await api.get('/api/pipeline/presets');

    expect(res.body).toHaveProperty('standard-tee');
    const preset = res.body['standard-tee'];
    expect(preset).toHaveProperty('name');
    expect(preset).toHaveProperty('description');
    expect(preset).toHaveProperty('config');
    expect(preset.config).toHaveProperty('markupPercent');
    expect(preset.config).toHaveProperty('rounding');
    expect(preset.config).toHaveProperty('sizeUpcharges');
  });

  test('includes multiple presets', async ({ api }) => {
    const res = await api.get('/api/pipeline/presets');
    const keys = Object.keys(res.body);

    expect(keys.length).toBeGreaterThanOrEqual(5);
    expect(keys).toContain('standard-tee');
    expect(keys).toContain('hoodie-fleece');
    expect(keys).toContain('headwear');
  });
});

test.describe('GET /api/pipeline/templates', () => {
  test('returns 200 with array (may be empty)', async ({ api }) => {
    const res = await api.get('/api/pipeline/templates');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

test.describe('Pipeline template CRUD', () => {
  test('create, list, and delete a template', async ({ api }) => {
    const templateName = `test-template-${Date.now()}`;

    // CREATE
    const createRes = await api.post('/api/pipeline/templates', {
      name: templateName,
      pricingPreset: 'standard-tee',
      collections: ['test-collection'],
    });
    expect(createRes.status).toBe(200);
    expect(createRes.body).toHaveProperty('name', templateName);
    expect(createRes.body).toHaveProperty('createdAt');
    expect(createRes.body).toHaveProperty('updatedAt');

    // LIST — should contain our template
    const listRes = await api.get('/api/pipeline/templates');
    expect(listRes.status).toBe(200);
    const names = listRes.body.map((t: { name: string }) => t.name);
    expect(names).toContain(templateName);

    // DELETE
    const deleteRes = await api.delete(`/api/pipeline/templates/${encodeURIComponent(templateName)}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toHaveProperty('deleted', true);

    // Confirm deletion
    const listAfterRes = await api.get('/api/pipeline/templates');
    const namesAfter = listAfterRes.body.map((t: { name: string }) => t.name);
    expect(namesAfter).not.toContain(templateName);
  });

  test('POST /api/pipeline/templates with empty name returns 400', async ({ api }) => {
    const res = await api.post('/api/pipeline/templates', {
      name: '',
      pricingPreset: 'standard-tee',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('DELETE /api/pipeline/templates/:name for nonexistent template returns 404', async ({ api }) => {
    const res = await api.delete('/api/pipeline/templates/nonexistent-template-xyz');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

test.describe('GET /api/pipeline/preview/:vendorId/:style', () => {
  test('returns 400 for unknown vendor', async ({ api }) => {
    const res = await api.get('/api/pipeline/preview/fake-vendor/PC61');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('Unknown vendor');
  });

  test('returns error for valid vendor with invalid style (no real credentials)', async ({ api }) => {
    // Without real vendor API credentials, this should return 500 with an error message
    // about missing credentials or connection failure — not crash
    const res = await api.get('/api/pipeline/preview/sanmar/INVALID-STYLE-999');

    // Should be either 400/404 (graceful handling) or 500 (credential/connection error)
    expect([400, 404, 500]).toContain(res.status);
    expect(res.body).toHaveProperty('error');
  });
});
