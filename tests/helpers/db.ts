import Database from 'better-sqlite3';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Seed WIX contacts for testing.
 * Inserts 3 contacts: one linked to test-customer-001, one unlinked, one with minimal data.
 */
export function seedTestWixContacts(dataDir: string): void {
  const db = new Database(join(dataDir, 'hotbox.db'));

  db.exec(`
    INSERT OR IGNORE INTO wix_contacts (
      wix_contact_id, first_name, last_name, email, phone,
      company, job_title, customer_id,
      wix_created_date, wix_updated_date,
      last_synced_at, created_at, updated_at
    ) VALUES
    (
      'wix-contact-001', 'Alice', 'Johnson', 'alice@example.com', '555-0101',
      'Acme Corp', 'Designer', 'test-customer-001',
      '2026-01-15T10:00:00Z', '2026-02-01T12:00:00Z',
      datetime('now'), datetime('now'), datetime('now')
    ),
    (
      'wix-contact-002', 'Bob', 'Smith', 'bob@example.com', '555-0102',
      'Smith LLC', 'Manager', NULL,
      '2026-01-20T10:00:00Z', '2026-02-05T12:00:00Z',
      datetime('now'), datetime('now'), datetime('now')
    ),
    (
      'wix-contact-003', 'Carol', 'Davis', 'carol@example.com', NULL,
      NULL, NULL, NULL,
      '2026-02-01T10:00:00Z', '2026-02-10T12:00:00Z',
      datetime('now'), datetime('now'), datetime('now')
    );
  `);

  db.close();
}

/**
 * Seed notification templates and log entries for testing.
 * Inserts 2 templates (email + sms for 'ordered' stage) and 2 log entries.
 */
export function seedTestNotifications(dataDir: string): void {
  const db = new Database(join(dataDir, 'hotbox.db'));

  // Note: migration 007 already seeds default templates.
  // We insert test-specific log entries referencing the seeded order.
  // First, get the template IDs for the seeded 'ordered' email/sms templates.
  const emailTemplate = db.prepare(
    "SELECT id FROM notification_templates WHERE stage = 'ordered' AND channel = 'email'"
  ).get() as { id: number } | undefined;

  const smsTemplate = db.prepare(
    "SELECT id FROM notification_templates WHERE stage = 'ordered' AND channel = 'sms'"
  ).get() as { id: number } | undefined;

  // Insert log entries referencing the seeded order.
  // orders.id is TEXT ('test-order-001'), notification_log.order_id references it via FK.
  // SQLite type affinity is flexible, so storing a TEXT value in an INTEGER column works.
  const emailTplId = emailTemplate?.id ?? null;
  const smsTplId = smsTemplate?.id ?? null;

  const insertLog = db.prepare(`
    INSERT OR IGNORE INTO notification_log (
      order_id, template_id, channel, recipient, subject, body, status, error_message, sent_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  insertLog.run(
    'test-order-001', emailTplId, 'email', 'test@example.com',
    'Order #1001 Confirmed', 'Your order #1001 has been placed',
    'sent', null, new Date().toISOString(),
  );
  insertLog.run(
    'test-order-001', smsTplId, 'sms', '555-0101',
    null, 'HotBox: Order #1001 placed',
    'failed', 'Twilio not configured', null,
  );

  db.close();
}

/**
 * Seed sample order data for testing.
 * Inserts one order with two line items.
 */
export function seedTestOrders(dataDir: string): void {
  const db = new Database(join(dataDir, 'hotbox.db'));

  db.exec(`
    INSERT OR IGNORE INTO orders (
      id, order_number, wix_order_id, source, status,
      customer_first_name, customer_last_name, customer_email,
      shipping_address, billing_address,
      subtotal, tax, total,
      created_at, updated_at
    ) VALUES (
      'test-order-001', 1001, 'wix-order-abc', 'wix', 'new',
      'Test', 'Customer', 'test@example.com',
      '{"street":"123 Test St","city":"Testville","state":"CA","zip":"90210","country":"US"}',
      '{"street":"123 Test St","city":"Testville","state":"CA","zip":"90210","country":"US"}',
      45.98, 3.68, 49.66,
      datetime('now'), datetime('now')
    );

    INSERT OR IGNORE INTO order_items (
      order_id, product_name, sku,
      vendor_style, vendor, color, size,
      quantity, unit_price, total_price
    ) VALUES
    (
      'test-order-001',
      'Test Tee', 'TST-BLK-M',
      'TST001', 'sanmar', 'Black', 'M',
      1, 22.99, 22.99
    ),
    (
      'test-order-001',
      'Test Tee', 'TST-BLK-L',
      'TST001', 'sanmar', 'Black', 'L',
      1, 22.99, 22.99
    );
  `);

  db.close();
}

/**
 * Seed sample customer data for testing.
 * Inserts one customer with a 20% markup.
 */
export function seedTestCustomers(dataDir: string): void {
  const db = new Database(join(dataDir, 'hotbox.db'));

  db.exec(`
    INSERT OR IGNORE INTO customers (
      id, name, contact_name, email, markup_percent, logo_keys, notes,
      created_at, updated_at
    ) VALUES (
      'test-customer-001', 'Test Corp', 'John Doe', 'orders@testcorp.com',
      20.0, '[]', 'Test customer for E2E tests',
      datetime('now'), datetime('now')
    );
  `);

  db.close();
}

/**
 * Seed a small test logo PNG (1x1 transparent pixel) into the logos directory.
 */
export function seedTestLogos(dataDir: string): void {
  const logosDir = join(dataDir, 'logos');
  mkdirSync(logosDir, { recursive: true });

  // 1x1 transparent PNG (68 bytes)
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const logoPath = join(logosDir, 'test-logo.png');
  if (!existsSync(logoPath)) {
    writeFileSync(logoPath, pngBuffer);
  }
}
