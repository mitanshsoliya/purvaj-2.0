-- Migration: 003_broadcast_center_enhancements.sql
-- Real-time Communication & Broadcast Center schema enhancements

-- 1. Enhance broadcasts table
ALTER TABLE broadcasts 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS action_label VARCHAR(100),
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS target_shop_ids JSONB DEFAULT '[]'::jsonb;

-- 2. Enhance notifications table
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS broadcast_id UUID REFERENCES broadcasts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS action_label VARCHAR(100);

-- 3. Ensure composite index for lightning-fast unread queries
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notif_broadcast ON notifications(broadcast_id);

-- 4. Seed Standard Shop Groups required by Purvaj Wholesale
INSERT INTO shop_groups (name, description, discount_percentage, status) VALUES
  ('VIP Shops', 'Premium retail partners with high order volume & >2L credit limit', 5.00, 'active'),
  ('Surat Shops', 'Retailers located in Surat & South Gujarat commercial region', 2.00, 'active'),
  ('New Shops', 'Recently onboarded retailers within first 30 days', 0.00, 'active'),
  ('Pending Payment Shops', 'Retailers with overdue invoices or outstanding credit limits', 0.00, 'active')
ON CONFLICT DO NOTHING;

-- Associate initial sample shops with Surat and VIP groups if not already associated
DO $$
DECLARE
  surat_group_id UUID;
  vip_group_id UUID;
  pending_group_id UUID;
  sample_shop_id UUID;
BEGIN
  SELECT id INTO surat_group_id FROM shop_groups WHERE name = 'Surat Shops' LIMIT 1;
  SELECT id INTO vip_group_id FROM shop_groups WHERE name = 'VIP Shops' LIMIT 1;
  SELECT id INTO pending_group_id FROM shop_groups WHERE name = 'Pending Payment Shops' LIMIT 1;

  -- Add any shop in Surat to Surat Shops group
  FOR sample_shop_id IN (SELECT id FROM shops WHERE LOWER(city) = 'surat' LIMIT 5) LOOP
    IF surat_group_id IS NOT NULL THEN
      INSERT INTO shop_group_members (shop_group_id, shop_id)
      VALUES (surat_group_id, sample_shop_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Add first active shop to VIP group
  SELECT id INTO sample_shop_id FROM shops WHERE status = 'active' LIMIT 1;
  IF sample_shop_id IS NOT NULL AND vip_group_id IS NOT NULL THEN
    INSERT INTO shop_group_members (shop_group_id, shop_id)
    VALUES (vip_group_id, sample_shop_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add shops with credit_used > 0 to Pending Payment Shops group
  FOR sample_shop_id IN (SELECT id FROM shops WHERE credit_used > 0 LIMIT 5) LOOP
    IF pending_group_id IS NOT NULL THEN
      INSERT INTO shop_group_members (shop_group_id, shop_id)
      VALUES (pending_group_id, sample_shop_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
