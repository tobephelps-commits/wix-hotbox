import { test, expect } from '../fixtures.js';

test.describe('GET /api/system', () => {
  test('returns 200 with system info', async ({ api }) => {
    const res = await api.get('/api/system');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('nodeVersion');
    expect(res.body).toHaveProperty('platform');
    expect(res.body).toHaveProperty('arch');
    expect(res.body).toHaveProperty('memoryUsage');
  });

  test('includes cpu info with loadAvg and cores', async ({ api }) => {
    const res = await api.get('/api/system');

    expect(res.body).toHaveProperty('cpu');
    expect(res.body.cpu).toHaveProperty('loadAvg');
    expect(Array.isArray(res.body.cpu.loadAvg)).toBe(true);
    expect(res.body.cpu).toHaveProperty('cores');
    expect(typeof res.body.cpu.cores).toBe('number');
  });

  test('includes memory info with totalMB, freeMB, usedPercent', async ({ api }) => {
    const res = await api.get('/api/system');

    expect(res.body).toHaveProperty('memory');
    expect(res.body.memory).toHaveProperty('totalMB');
    expect(res.body.memory).toHaveProperty('freeMB');
    expect(res.body.memory).toHaveProperty('usedPercent');
    expect(typeof res.body.memory.totalMB).toBe('number');
    expect(typeof res.body.memory.freeMB).toBe('number');
    expect(typeof res.body.memory.usedPercent).toBe('number');
  });

  test('includes database info', async ({ api }) => {
    const res = await api.get('/api/system');

    expect(res.body).toHaveProperty('database');
    expect(res.body.database).toHaveProperty('path');
    expect(res.body.database).toHaveProperty('sizeMB');
    expect(res.body.database).toHaveProperty('migrationsApplied');
    expect(typeof res.body.database.migrationsApplied).toBe('number');
  });

  test('includes network info', async ({ api }) => {
    const res = await api.get('/api/system');

    expect(res.body).toHaveProperty('network');
    expect(res.body.network).toHaveProperty('hostname');
    expect(res.body.network).toHaveProperty('accessUrls');
  });
});

test.describe('GET /api/network', () => {
  test('returns 200 with hostname and accessUrls', async ({ api }) => {
    const res = await api.get('/api/network');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('hostname');
    expect(typeof res.body.hostname).toBe('string');
    expect(res.body).toHaveProperty('accessUrls');
    expect(Array.isArray(res.body.accessUrls)).toBe(true);
  });

  test('includes addresses and port', async ({ api }) => {
    const res = await api.get('/api/network');

    expect(res.body).toHaveProperty('addresses');
    expect(Array.isArray(res.body.addresses)).toBe(true);
    expect(res.body).toHaveProperty('port');
    expect(typeof res.body.port).toBe('number');
  });

  test('includes mdnsName', async ({ api }) => {
    const res = await api.get('/api/network');

    expect(res.body).toHaveProperty('mdnsName');
    expect(res.body.mdnsName).toBe('hotbox');
  });
});
