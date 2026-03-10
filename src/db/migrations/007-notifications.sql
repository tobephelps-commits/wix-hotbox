-- Migration 007: Notification System
-- Configurable order status notifications with delivery logging.
-- Templates define what messages to send per stage+channel.
-- Log tracks every notification attempt with status and error details.

CREATE TABLE IF NOT EXISTS notification_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage TEXT NOT NULL,
  channel TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  subject TEXT,
  body_template TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(stage, channel)
);

CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES notification_templates(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notification_log_order ON notification_log(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);

-- Seed default email templates (enabled by default)
INSERT OR IGNORE INTO notification_templates (stage, channel, enabled, subject, body_template) VALUES
  ('ordered', 'email', 1, 'Order #{{orderNumber}} Confirmed', 'Your order #{{orderNumber}} has been placed with our supplier'),
  ('shipped', 'email', 1, 'Order #{{orderNumber}} Shipped', 'Your order #{{orderNumber}} has shipped!'),
  ('delivered', 'email', 1, 'Order #{{orderNumber}} Delivered', 'Your order #{{orderNumber}} has been delivered');

-- Seed default SMS templates (disabled until Twilio configured)
INSERT OR IGNORE INTO notification_templates (stage, channel, enabled, subject, body_template) VALUES
  ('ordered', 'sms', 0, NULL, 'HotBox: Order #{{orderNumber}} placed with supplier'),
  ('shipped', 'sms', 0, NULL, 'HotBox: Order #{{orderNumber}} shipped!');
