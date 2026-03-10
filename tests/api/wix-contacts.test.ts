import { test, expect } from '../fixtures.js';

// =============================================================================
// GET /api/wix-contacts -- List WIX contacts
// =============================================================================

test.describe('GET /api/wix-contacts', () => {
  test('returns 200 with contacts array', async ({ seededApi }) => {
    const res = await seededApi.get('/api/wix-contacts');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('contacts');
    expect(Array.isArray(res.body.contacts)).toBe(true);
    expect(res.body.contacts.length).toBeGreaterThanOrEqual(3);
    expect(res.body).toHaveProperty('total');
    expect(res.body.total).toBe(res.body.contacts.length);
  });

  test('filters by search term (name)', async ({ seededApi }) => {
    const res = await seededApi.get('/api/wix-contacts?search=Alice');

    expect(res.status).toBe(200);
    expect(res.body.contacts.length).toBeGreaterThanOrEqual(1);
    const names = res.body.contacts.map((c: any) => c.firstName);
    expect(names).toContain('Alice');
  });

  test('filters by search term (email)', async ({ seededApi }) => {
    const res = await seededApi.get('/api/wix-contacts?search=bob@example');

    expect(res.status).toBe(200);
    expect(res.body.contacts.length).toBeGreaterThanOrEqual(1);
    const emails = res.body.contacts.map((c: any) => c.email);
    expect(emails).toContain('bob@example.com');
  });

  test('filters linked contacts (linked=true)', async ({ seededApi }) => {
    const res = await seededApi.get('/api/wix-contacts?linked=true');

    expect(res.status).toBe(200);
    for (const contact of res.body.contacts) {
      expect(contact.customerId).not.toBeNull();
    }
    expect(res.body.contacts.length).toBeGreaterThanOrEqual(1);
  });

  test('filters unlinked contacts (linked=false)', async ({ seededApi }) => {
    const res = await seededApi.get('/api/wix-contacts?linked=false');

    expect(res.status).toBe(200);
    for (const contact of res.body.contacts) {
      expect(contact.customerId).toBeNull();
    }
    expect(res.body.contacts.length).toBeGreaterThanOrEqual(2);
  });
});

// =============================================================================
// GET /api/wix-contacts/stats -- Contact statistics
// =============================================================================

test.describe('GET /api/wix-contacts/stats', () => {
  test('returns stat object with counts', async ({ seededApi }) => {
    const res = await seededApi.get('/api/wix-contacts/stats');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('linked');
    expect(res.body).toHaveProperty('unlinked');
    expect(res.body).toHaveProperty('lastSyncedAt');
    expect(typeof res.body.total).toBe('number');
    expect(res.body.total).toBeGreaterThanOrEqual(3);
    expect(res.body.linked).toBeGreaterThanOrEqual(1);
    expect(res.body.unlinked).toBeGreaterThanOrEqual(2);
  });
});

// =============================================================================
// GET /api/wix-contacts/:wixContactId -- Get single contact
// =============================================================================

test.describe('GET /api/wix-contacts/:wixContactId', () => {
  test('returns single contact by ID', async ({ seededApi }) => {
    const res = await seededApi.get('/api/wix-contacts/wix-contact-001');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('wixContactId', 'wix-contact-001');
    expect(res.body).toHaveProperty('firstName', 'Alice');
    expect(res.body).toHaveProperty('lastName', 'Johnson');
    expect(res.body).toHaveProperty('email', 'alice@example.com');
    expect(res.body).toHaveProperty('customerId', 'test-customer-001');
  });

  test('returns 404 for non-existent contact', async ({ api }) => {
    const res = await api.get('/api/wix-contacts/nonexistent-id');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// POST /api/wix-contacts/:wixContactId/link -- Link contact to customer
// =============================================================================

test.describe('POST /api/wix-contacts/:wixContactId/link', () => {
  test('links unlinked contact to customer', async ({ seededApi }) => {
    const res = await seededApi.post('/api/wix-contacts/wix-contact-002/link', {
      customerId: 'test-customer-001',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('customerId', 'test-customer-001');
    expect(res.body).toHaveProperty('wixContactId', 'wix-contact-002');
  });

  test('returns 400 when customerId is missing', async ({ seededApi }) => {
    const res = await seededApi.post('/api/wix-contacts/wix-contact-002/link', {});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 404 for non-existent contact', async ({ seededApi }) => {
    const res = await seededApi.post('/api/wix-contacts/nonexistent/link', {
      customerId: 'test-customer-001',
    });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 404 for non-existent customer', async ({ seededApi }) => {
    const res = await seededApi.post('/api/wix-contacts/wix-contact-002/link', {
      customerId: 'nonexistent-customer',
    });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// DELETE /api/wix-contacts/:wixContactId/link -- Unlink contact
// =============================================================================

test.describe('DELETE /api/wix-contacts/:wixContactId/link', () => {
  test('unlinks contact from customer', async ({ seededApi }) => {
    const res = await seededApi.delete('/api/wix-contacts/wix-contact-001/link');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('wixContactId', 'wix-contact-001');
    expect(res.body.customerId).toBeNull();
  });

  test('returns 404 for non-existent contact', async ({ api }) => {
    const res = await api.delete('/api/wix-contacts/nonexistent/link');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
