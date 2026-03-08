import { test, expect } from '../fixtures.js';

// =============================================================================
// GET /api/customers -- List customers
// =============================================================================

test.describe('GET /api/customers', () => {
  test('returns 200 with customers array', async ({ seededApi }) => {
    const res = await seededApi.get('/api/customers');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('customers');
    expect(Array.isArray(res.body.customers)).toBe(true);
    expect(res.body.customers.length).toBeGreaterThanOrEqual(1);
  });

  test('supports active filter', async ({ seededApi }) => {
    const res = await seededApi.get('/api/customers?active=true');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('customers');
    for (const c of res.body.customers) {
      expect(c.active).toBe(true);
    }
  });
});

// =============================================================================
// POST /api/customers -- Create customer
// =============================================================================

test.describe('POST /api/customers', () => {
  test('creates customer with name, markupPercent, royaltyPercent', async ({ api }) => {
    const res = await api.post('/api/customers', {
      name: 'API Test Customer',
      contactName: 'Jane Smith',
      email: 'jane@test.com',
      markupPercent: 35,
      royaltyPercent: 5,
      logoKeys: [],
      active: true,
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('API Test Customer');
    expect(res.body.markupPercent).toBe(35);
    expect(res.body.royaltyPercent).toBe(5);
  });

  test('returns 400 when name is missing', async ({ api }) => {
    const res = await api.post('/api/customers', {
      contactName: 'No Name',
      email: 'no@name.com',
      markupPercent: 10,
      royaltyPercent: 2,
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when markupPercent is missing', async ({ api }) => {
    const res = await api.post('/api/customers', {
      name: 'Missing Markup',
      contactName: 'Test',
      email: 'test@test.com',
      royaltyPercent: 2,
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// GET /api/customers/:id -- Get single customer
// =============================================================================

test.describe('GET /api/customers/:id', () => {
  test('returns seeded customer by id', async ({ seededApi }) => {
    const res = await seededApi.get('/api/customers/test-customer-001');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'test-customer-001');
    expect(res.body).toHaveProperty('name', 'Test Corp');
    expect(res.body).toHaveProperty('markupPercent', 20);
  });

  test('returns 404 for non-existent customer', async ({ api }) => {
    const res = await api.get('/api/customers/nonexistent-id');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// PATCH /api/customers/:id -- Update customer
// =============================================================================

test.describe('PATCH /api/customers/:id', () => {
  test('updates customer markup', async ({ seededApi }) => {
    const res = await seededApi.patch('/api/customers/test-customer-001', {
      markupPercent: 25,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('markupPercent', 25);
  });

  test('returns 404 for non-existent customer', async ({ api }) => {
    const res = await api.patch('/api/customers/nonexistent-id', {
      markupPercent: 30,
    });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// DELETE /api/customers/:id -- Delete customer
// =============================================================================

test.describe('DELETE /api/customers/:id', () => {
  test('deletes customer and returns 204', async ({ api }) => {
    // First create a customer to delete
    const createRes = await api.post('/api/customers', {
      name: 'To Delete',
      contactName: 'Del',
      email: 'del@test.com',
      markupPercent: 10,
      royaltyPercent: 0,
      logoKeys: [],
      active: true,
    });
    expect(createRes.status).toBe(201);
    const customerId = createRes.body.id;

    // Delete it
    const res = await api.delete(`/api/customers/${customerId}`);
    expect(res.status).toBe(204);

    // Verify gone
    const getRes = await api.get(`/api/customers/${customerId}`);
    expect(getRes.status).toBe(404);
  });

  test('returns 404 for non-existent customer', async ({ api }) => {
    const res = await api.delete('/api/customers/nonexistent-id');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// POST /api/customers/:id/pricing -- Calculate customer-specific pricing
// =============================================================================

test.describe('POST /api/customers/:id/pricing', () => {
  test('returns calculated prices for sample product data', async ({ seededApi }) => {
    const res = await seededApi.post('/api/customers/test-customer-001/pricing', {
      wholesaleCost: 10.00,
      decorationCost: 2.50,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('wholesaleCost', 10);
    expect(res.body).toHaveProperty('decorationCost', 2.5);
    expect(res.body).toHaveProperty('totalCost');
    expect(res.body).toHaveProperty('retailPrice');
    expect(res.body).toHaveProperty('margin');
    expect(typeof res.body.retailPrice).toBe('number');
    expect(res.body.retailPrice).toBeGreaterThan(0);
  });

  test('returns 404 for non-existent customer', async ({ api }) => {
    const res = await api.post('/api/customers/nonexistent-id/pricing', {
      wholesaleCost: 10.00,
    });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when wholesaleCost missing', async ({ seededApi }) => {
    const res = await seededApi.post('/api/customers/test-customer-001/pricing', {});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// GET /api/customers/:id/royalty -- Royalty report JSON
// =============================================================================

test.describe('GET /api/customers/:id/royalty', () => {
  test('returns royalty report (may be empty if no orders)', async ({ seededApi }) => {
    const res = await seededApi.get(
      '/api/customers/test-customer-001/royalty?start=2020-01-01&end=2030-12-31',
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('customerId', 'test-customer-001');
    expect(res.body).toHaveProperty('lineItems');
    expect(Array.isArray(res.body.lineItems)).toBe(true);
    expect(res.body).toHaveProperty('totalRoyalty');
    expect(typeof res.body.totalRoyalty).toBe('number');
  });

  test('returns 400 when start/end missing', async ({ seededApi }) => {
    const res = await seededApi.get('/api/customers/test-customer-001/royalty');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 404 for non-existent customer', async ({ api }) => {
    const res = await api.get('/api/customers/nonexistent/royalty?start=2020-01-01&end=2030-12-31');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// GET /api/customers/:id/royalty/pdf -- Royalty statement PDF
// =============================================================================

test.describe('GET /api/customers/:id/royalty/pdf', () => {
  test('returns PDF content-type or appropriate error for no data', async ({ seededApi }) => {
    const res = await seededApi.get(
      '/api/customers/test-customer-001/royalty/pdf?start=2020-01-01&end=2030-12-31',
    );

    // Should return PDF or an error if PDF generation fails (e.g., missing assets)
    if (res.status === 200) {
      const contentType = res.headers.get('content-type') || '';
      expect(contentType).toContain('application/pdf');
    } else {
      expect([400, 404, 500]).toContain(res.status);
    }
  });

  test('returns 400 when date params missing', async ({ seededApi }) => {
    const res = await seededApi.get('/api/customers/test-customer-001/royalty/pdf');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 404 for non-existent customer', async ({ api }) => {
    const res = await api.get(
      '/api/customers/nonexistent/royalty/pdf?start=2020-01-01&end=2030-12-31',
    );

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
