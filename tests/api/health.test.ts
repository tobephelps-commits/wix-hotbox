import { test, expect } from '../fixtures.js';

test.describe('GET /api/health', () => {
  test('returns 200 with status ok', async ({ api }) => {
    const res = await api.get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  test('includes version, uptime, and timestamp', async ({ api }) => {
    const res = await api.get('/api/health');

    expect(res.body).toHaveProperty('version');
    expect(typeof res.body.version).toBe('string');
    expect(res.body).toHaveProperty('uptime');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body).toHaveProperty('timestamp');
    // Timestamp should be a valid ISO string
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  test('responds within 500ms', async ({ api }) => {
    const start = Date.now();
    const res = await api.get('/api/health');
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });
});
