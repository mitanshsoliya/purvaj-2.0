-- ============================================================
-- PURVAJ 2.0 — Migration 004: Payment Gateway, Delivery Management,
-- WhatsApp / SMS Architecture, Notification Preferences & Report Indexes
-- ============================================================

-- 1. PAYMENT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_ref VARCHAR(100) UNIQUE NOT NULL,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  method VARCHAR(50) NOT NULL DEFAULT 'online_gateway', -- 'online_gateway', 'cash', 'bank_transfer', 'upi', 'credit'
  gateway_provider VARCHAR(50) NOT NULL DEFAULT 'sandbox', -- 'sandbox', 'razorpay', 'cashfree'
  gateway_order_id VARCHAR(150),
  gateway_payment_id VARCHAR(150),
  gateway_signature VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'INITIATED', -- 'PENDING', 'INITIATED', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'
  idempotency_key VARCHAR(150) UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_reason TEXT,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ptxn_shop ON payment_transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_ptxn_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_ptxn_invoice ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ptxn_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_ptxn_ref ON payment_transactions(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_ptxn_gateway_order ON payment_transactions(gateway_order_id);

-- Add online_gateway to payment_method enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'online_gateway';

-- Add transaction foreign key to payments table if not already present
DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_metadata JSONB DEFAULT '{}'::jsonb;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. EXTEND ORDERS FOR DELIVERY MANAGEMENT
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_person VARCHAR(150);
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_date TIMESTAMPTZ;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'ORDERED';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. DELIVERY STATUS HISTORY (Audit Trail)
CREATE TABLE IF NOT EXISTS delivery_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  note TEXT,
  driver_name VARCHAR(150),
  driver_mobile VARCHAR(20),
  vehicle_number VARCHAR(50),
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_order ON delivery_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_dsh_created ON delivery_status_history(created_at);

-- 4. WHATSAPP & SMS MESSAGE LOGS
CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel VARCHAR(20) NOT NULL, -- 'whatsapp', 'sms'
  provider VARCHAR(50) NOT NULL DEFAULT 'sandbox',
  recipient VARCHAR(50) NOT NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL, -- 'ORDER_CONFIRMED', 'ORDER_STATUS_UPDATE', 'DELIVERY_UPDATE', 'INVOICE_GENERATED', 'PAYMENT_CONFIRMED', 'PAYMENT_REMINDER', 'BROADCAST_ALERT'
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  template_name VARCHAR(100),
  provider_message_id VARCHAR(150),
  status VARCHAR(50) NOT NULL DEFAULT 'queued', -- 'queued', 'sent', 'delivered', 'failed', 'simulated'
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_logs_recipient ON message_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_msg_logs_shop ON message_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_msg_logs_event ON message_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_msg_logs_status ON message_logs(status);
CREATE INDEX IF NOT EXISTS idx_msg_logs_created ON message_logs(created_at);

-- 5. NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID UNIQUE NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  channel_in_app BOOLEAN NOT NULL DEFAULT true,
  channel_whatsapp BOOLEAN NOT NULL DEFAULT true,
  channel_sms BOOLEAN NOT NULL DEFAULT true,
  order_updates BOOLEAN NOT NULL DEFAULT true,
  payment_reminders BOOLEAN NOT NULL DEFAULT true,
  promotional_offers BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_pref_shop ON notification_preferences(shop_id);

-- Initialize preferences for all existing shops
INSERT INTO notification_preferences (shop_id)
SELECT id FROM shops
ON CONFLICT (shop_id) DO NOTHING;

-- 6. REPORTING AND ANALYTICS PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_report_composite ON orders(created_at, order_status, shop_id);
CREATE INDEX IF NOT EXISTS idx_payments_report_composite ON payments(payment_date, status, method, shop_id);
CREATE INDEX IF NOT EXISTS idx_invoices_report_composite ON invoices(invoice_date, status, shop_id);
