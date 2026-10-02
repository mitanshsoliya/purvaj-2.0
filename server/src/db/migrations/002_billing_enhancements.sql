-- ============================================================
-- PURVAJ 2.0 — Billing & GST Enhancements Migration
-- ============================================================

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS cgst NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS outstanding NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
ADD COLUMN IF NOT EXISTS is_interstate BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  item_name VARCHAR(200) NOT NULL,
  sku VARCHAR(50),
  hsn_code VARCHAR(20),
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(20) DEFAULT 'pcs',
  rate NUMERIC(12,2) NOT NULL CHECK (rate >= 0),
  discount NUMERIC(12,2) DEFAULT 0 CHECK (discount >= 0),
  tax_rate NUMERIC(5,2) DEFAULT 0 CHECK (tax_rate >= 0),
  cgst NUMERIC(12,2) DEFAULT 0,
  sgst NUMERIC(12,2) DEFAULT 0,
  igst NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
