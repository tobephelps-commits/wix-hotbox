import Database from 'better-sqlite3';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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
