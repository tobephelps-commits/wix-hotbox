import { test as base, expect } from '@playwright/test';
import { startTestServer, type TestServer } from './helpers/server.js';
import { apiClient, type ApiClient } from './helpers/api.js';
import { seedTestOrders, seedTestCustomers, seedTestLogos } from './helpers/db.js';

type TestFixtures = {
  api: ApiClient;
};

type WorkerFixtures = {
  server: TestServer;
  seededServer: TestServer;
};

/**
 * Extended Playwright test with custom fixtures for HotBox testing.
 *
 * - `server`: worker-scoped test server (started once per worker, cleaned up after)
 * - `api`: per-test API client connected to the test server
 * - `seededServer`: like server but pre-populated with test data
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Worker-scoped: one server per worker process
  server: [async ({}, use) => {
    const server = await startTestServer();
    await use(server);
    await server.cleanup();
  }, { scope: 'worker' }],

  // Worker-scoped: server + seeded data
  seededServer: [async ({}, use) => {
    const server = await startTestServer(3458);
    seedTestOrders(server.dataDir);
    seedTestCustomers(server.dataDir);
    seedTestLogos(server.dataDir);
    await use(server);
    await server.cleanup();
  }, { scope: 'worker' }],

  // Per-test: API client connected to the server
  api: async ({ server }, use) => {
    const client = apiClient(server.baseUrl);
    await use(client);
  },
});

export { expect };
