import { test, expect } from '../fixtures.js';

test.describe('GET /api/vendors', () => {
  test('returns 200 with vendors array', async ({ api }) => {
    const res = await api.get('/api/vendors');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('vendors');
    expect(Array.isArray(res.body.vendors)).toBe(true);
    expect(res.body.vendors.length).toBeGreaterThanOrEqual(2);
  });

  test('vendor objects have id and name fields', async ({ api }) => {
    const res = await api.get('/api/vendors');

    for (const vendor of res.body.vendors) {
      expect(vendor).toHaveProperty('id');
      expect(vendor).toHaveProperty('name');
      expect(typeof vendor.id).toBe('string');
      expect(typeof vendor.name).toBe('string');
    }
  });

  test('includes SanMar vendor', async ({ api }) => {
    const res = await api.get('/api/vendors');
    const ids = res.body.vendors.map((v: { id: string }) => v.id);

    expect(ids).toContain('sanmar');
  });

  test('includes S&S Activewear vendor', async ({ api }) => {
    const res = await api.get('/api/vendors');
    const ids = res.body.vendors.map((v: { id: string }) => v.id);

    expect(ids).toContain('ss');
  });
});
