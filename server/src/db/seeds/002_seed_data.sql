-- ============================================================
-- PURVAJ 2.0 — B2B Wholesale Platform
-- Development Seed Data
-- ============================================================

-- ============================================================
-- PASSWORD: 'Purvaj@2026' for all test users
-- bcrypt hash of 'Purvaj@2026' with 10 rounds
-- ============================================================

-- 1. USERS (Admin + 5 Shop Owners)
INSERT INTO users (id, name, email, mobile, password_hash, role, is_active) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Mitansh Soliya', 'admin@purvaj.com', '9724006035', '$2a$10$ZUWtFDRu7dBZHNaZn2kSfu4aJbtL7ne5ycj4BYSaFu2991Js4uDQG', 'super_admin', true),
  ('a0000001-0000-0000-0000-000000000002', 'Rajesh Warehouse', 'rajesh@purvaj.com', '9876543210', '$2a$10$ZUWtFDRu7dBZHNaZn2kSfu4aJbtL7ne5ycj4BYSaFu2991Js4uDQG', 'warehouse_manager', true),
  ('a0000001-0000-0000-0000-000000000003', 'Priya Billing', 'priya@purvaj.com', '9876543211', '$2a$10$ZUWtFDRu7dBZHNaZn2kSfu4aJbtL7ne5ycj4BYSaFu2991Js4uDQG', 'billing_clerk', true),
  -- Shop Owners
  ('b0000001-0000-0000-0000-000000000001', 'Ramesh Patel', 'ramesh@sktraders.com', '9898001001', '$2a$10$ZUWtFDRu7dBZHNaZn2kSfu4aJbtL7ne5ycj4BYSaFu2991Js4uDQG', 'shop_owner', true),
  ('b0000001-0000-0000-0000-000000000002', 'Sunil Shah', 'sunil@jaymatadi.com', '9898001002', '$2a$10$ZUWtFDRu7dBZHNaZn2kSfu4aJbtL7ne5ycj4BYSaFu2991Js4uDQG', 'shop_owner', true),
  ('b0000001-0000-0000-0000-000000000003', 'Bhavesh Modi', 'bhavesh@krishnastore.com', '9898001003', '$2a$10$ZUWtFDRu7dBZHNaZn2kSfu4aJbtL7ne5ycj4BYSaFu2991Js4uDQG', 'shop_owner', true),
  ('b0000001-0000-0000-0000-000000000004', 'Dinesh Joshi', 'dinesh@mahadevtraders.com', '9898001004', '$2a$10$ZUWtFDRu7dBZHNaZn2kSfu4aJbtL7ne5ycj4BYSaFu2991Js4uDQG', 'shop_owner', true),
  ('b0000001-0000-0000-0000-000000000005', 'Vijay Sharma', 'vijay@ganeshdistributor.com', '9898001005', '$2a$10$ZUWtFDRu7dBZHNaZn2kSfu4aJbtL7ne5ycj4BYSaFu2991Js4uDQG', 'shop_owner', true)
ON CONFLICT (email) DO NOTHING;

-- 2. SHOPS (5 registered retail shops)
INSERT INTO shops (id, owner_user_id, shop_name, owner_name, mobile, email, address, city, state, pincode, gstin, credit_limit, credit_used, payment_terms, status) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'Shree Krishna Traders', 'Ramesh Patel', '9898001001', 'ramesh@sktraders.com', 'Shop No 12, Sindhu Bhavan Road', 'Ahmedabad', 'Gujarat', '380054', '24AAACP1234M1Z2', 250000.00, 0.00, 15, 'active'),
  ('c0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000002', 'Jai Matadi Enterprise', 'Sunil Shah', '9898001002', 'sunil@jaymatadi.com', 'A/15 GIDC Estate', 'Rajkot', 'Gujarat', '360002', '24BBBCQ5678N2Z3', 180000.00, 0.00, 15, 'active'),
  ('c0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000003', 'Krishna General Store', 'Bhavesh Modi', '9898001003', 'bhavesh@krishnastore.com', 'Station Road, Near Bus Stand', 'Surat', 'Gujarat', '395001', '24CCCDR7890P3Z4', 150000.00, 0.00, 10, 'active'),
  ('c0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000004', 'Mahadev Traders', 'Dinesh Joshi', '9898001004', 'dinesh@mahadevtraders.com', 'Kalupur Market, Opp Post Office', 'Ahmedabad', 'Gujarat', '380001', '24DDDES1122Q4Z5', 300000.00, 0.00, 20, 'active'),
  ('c0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000005', 'Ganesh Distributor', 'Vijay Sharma', '9898001005', 'vijay@ganeshdistributor.com', 'Ring Road, Bhavnagar Highway', 'Vadodara', 'Gujarat', '390007', '24EEEFT3344R5Z6', 200000.00, 0.00, 15, 'pending_approval')
ON CONFLICT DO NOTHING;

-- 3. SHOP_GROUPS
INSERT INTO shop_groups (id, name, description, discount_percentage, status) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'Gold Tier Retailers', 'Premium wholesale partners with >2L credit limit', 5.00, 'active'),
  ('d0000001-0000-0000-0000-000000000002', 'Silver Tier Retailers', 'Standard wholesale partners', 2.50, 'active'),
  ('d0000001-0000-0000-0000-000000000003', 'New Retailers', 'Recently onboarded shops under evaluation', 0.00, 'active')
ON CONFLICT DO NOTHING;

-- 4. SHOP_GROUP_MEMBERS
INSERT INTO shop_group_members (shop_group_id, shop_id) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001'),
  ('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000004'),
  ('d0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002'),
  ('d0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003'),
  ('d0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000005')
ON CONFLICT DO NOTHING;

-- 5. CATEGORIES
INSERT INTO categories (id, name, slug, description, sort_order, status) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'Snacks & Namkeen', 'snacks-namkeen', 'Wholesale snacks, chips, namkeen, and dry munchies', 1, 'active'),
  ('e0000001-0000-0000-0000-000000000002', 'Beverages', 'beverages', 'Cold drinks, juices, tea, coffee, and health drinks', 2, 'active'),
  ('e0000001-0000-0000-0000-000000000003', 'Personal Care', 'personal-care', 'Soaps, shampoos, toothpaste, and hygiene products', 3, 'active'),
  ('e0000001-0000-0000-0000-000000000004', 'Cooking Essentials', 'cooking-essentials', 'Oils, ghee, spices, atta, sugar, and dal', 4, 'active'),
  ('e0000001-0000-0000-0000-000000000005', 'Dairy & Frozen', 'dairy-frozen', 'Milk, butter, paneer, ice cream, and frozen goods', 5, 'active'),
  ('e0000001-0000-0000-0000-000000000006', 'Household & Cleaning', 'household-cleaning', 'Detergent, floor cleaners, tissues, and utensils', 6, 'active')
ON CONFLICT DO NOTHING;

-- 6. BRANDS
INSERT INTO brands (id, name, slug, description, status) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'Balaji Wafers', 'balaji-wafers', 'Gujarat no. 1 snacks and wafers brand', 'active'),
  ('f0000001-0000-0000-0000-000000000002', 'Parle', 'parle', 'Parle Products - Biscuits, snacks, and confectionery', 'active'),
  ('f0000001-0000-0000-0000-000000000003', 'Amul', 'amul', 'Amul - The Taste of India, dairy products', 'active'),
  ('f0000001-0000-0000-0000-000000000004', 'Tata', 'tata', 'Tata Consumer Products - Tea, salt, spices', 'active'),
  ('f0000001-0000-0000-0000-000000000005', 'Hindustan Unilever', 'hul', 'HUL - Personal care, home care, foods', 'active'),
  ('f0000001-0000-0000-0000-000000000006', 'Patanjali', 'patanjali', 'Patanjali Ayurved - Natural FMCG products', 'active'),
  ('f0000001-0000-0000-0000-000000000007', 'Coca-Cola', 'coca-cola', 'Coca-Cola beverages portfolio', 'active')
ON CONFLICT DO NOTHING;

-- 7. PRODUCTS (10 wholesale products)
INSERT INTO products (id, category_id, brand_id, sku, name, description, unit, pack_size, mrp, selling_price, purchase_price, tax_rate, hsn_code, minimum_order_quantity, minimum_stock, status) VALUES
  ('10000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001',
   'BLJ-MSTK-150', 'Balaji Masala Wafers 150g', 'Crispy masala potato wafers - family pack 150g', 'piece', 48, 30.00, 26.50, 22.00, 12.00, '19052090', 12, 100, 'active'),

  ('10000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000002',
   'PRL-G20-800', 'Parle-G Gold Biscuit 800g', 'Parle-G Gold premium glucose biscuits - value pack', 'piece', 24, 95.00, 82.00, 72.00, 18.00, '19053100', 6, 80, 'active'),

  ('10000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000005', 'f0000001-0000-0000-0000-000000000003',
   'AML-BTR-500', 'Amul Butter 500g Carton', 'Amul pasteurized butter - 500g branded carton', 'piece', 30, 280.00, 252.00, 235.00, 12.00, '04051000', 5, 40, 'active'),

  ('10000001-0000-0000-0000-000000000004', 'e0000001-0000-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000004',
   'TATA-TEA-1KG', 'Tata Tea Premium 1Kg', 'Premium CTC leaf tea for daily use - 1Kg pouch', 'piece', 12, 520.00, 465.00, 420.00, 5.00, '09024010', 3, 50, 'active'),

  ('10000001-0000-0000-0000-000000000005', 'e0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000005',
   'HUL-LUX-3PK', 'Lux Soft Touch Soap 3-Pack', 'Lux beauty soap 150g x 3 combo multipack', 'piece', 36, 180.00, 155.00, 138.00, 18.00, '34011130', 6, 60, 'active'),

  ('10000001-0000-0000-0000-000000000006', 'e0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000007',
   'COCA-2L', 'Coca-Cola 2 Litre PET Bottle', 'Coca-Cola original taste 2L PET bottle', 'piece', 9, 95.00, 82.00, 72.00, 28.00, '22021010', 9, 60, 'active'),

  ('10000001-0000-0000-0000-000000000007', 'e0000001-0000-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000004',
   'TATA-SALT-1KG', 'Tata Salt 1Kg Iodized', 'Tata salt vacuum evaporated iodized salt - 1Kg', 'piece', 24, 28.00, 24.00, 20.00, 5.00, '25010020', 12, 120, 'active'),

  ('10000001-0000-0000-0000-000000000008', 'e0000001-0000-0000-0000-000000000006', 'f0000001-0000-0000-0000-000000000005',
   'HUL-SURF-1KG', 'Surf Excel Quick Wash 1Kg', 'Surf Excel quick wash detergent powder - 1Kg', 'piece', 12, 245.00, 215.00, 190.00, 18.00, '34022010', 6, 50, 'active'),

  ('10000001-0000-0000-0000-000000000009', 'e0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001',
   'BLJ-SPDNMK-400', 'Balaji Spicy Mixture Namkeen 400g', 'Classic Gujarati spicy namkeen mixture - 400g pack', 'piece', 24, 120.00, 105.00, 92.00, 12.00, '19041090', 6, 70, 'active'),

  ('10000001-0000-0000-0000-000000000010', 'e0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000006',
   'PTJ-DANT-200', 'Patanjali Dant Kanti 200g', 'Patanjali herbal toothpaste with 26 herbs - 200g', 'piece', 48, 100.00, 86.00, 74.00, 18.00, '33061020', 12, 80, 'active')
ON CONFLICT (sku) DO NOTHING;

-- 8. INVENTORY (central warehouse stock for all 10 products)
INSERT INTO inventory (id, product_id, current_stock, reserved_stock, minimum_stock, last_restocked_at) VALUES
  ('20000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000001', 480, 0, 100, NOW() - INTERVAL '3 days'),
  ('20000001-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000002', 192, 0, 80, NOW() - INTERVAL '5 days'),
  ('20000001-0000-0000-0000-000000000003', '10000001-0000-0000-0000-000000000003', 120, 0, 40, NOW() - INTERVAL '2 days'),
  ('20000001-0000-0000-0000-000000000004', '10000001-0000-0000-0000-000000000004', 84, 0, 50, NOW() - INTERVAL '7 days'),
  ('20000001-0000-0000-0000-000000000005', '10000001-0000-0000-0000-000000000005', 216, 0, 60, NOW() - INTERVAL '4 days'),
  ('20000001-0000-0000-0000-000000000006', '10000001-0000-0000-0000-000000000006', 54, 0, 60, NOW() - INTERVAL '1 day'),
  ('20000001-0000-0000-0000-000000000007', '10000001-0000-0000-0000-000000000007', 360, 0, 120, NOW() - INTERVAL '6 days'),
  ('20000001-0000-0000-0000-000000000008', '10000001-0000-0000-0000-000000000008', 72, 0, 50, NOW() - INTERVAL '10 days'),
  ('20000001-0000-0000-0000-000000000009', '10000001-0000-0000-0000-000000000009', 168, 0, 70, NOW() - INTERVAL '3 days'),
  ('20000001-0000-0000-0000-000000000010', '10000001-0000-0000-0000-000000000010', 288, 0, 80, NOW() - INTERVAL '8 days')
ON CONFLICT (product_id) DO NOTHING;

-- 9. STOCK TRANSACTIONS (Initial stock-in entries)
INSERT INTO stock_transactions (product_id, type, quantity, reference_type, previous_stock, new_stock, note, created_by, created_at) VALUES
  ('10000001-0000-0000-0000-000000000001', 'STOCK_IN', 480, 'purchase', 0, 480, 'Initial warehouse stock - Balaji Wafers', 'a0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days'),
  ('10000001-0000-0000-0000-000000000002', 'STOCK_IN', 192, 'purchase', 0, 192, 'Initial warehouse stock - Parle-G Gold', 'a0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days'),
  ('10000001-0000-0000-0000-000000000003', 'STOCK_IN', 120, 'purchase', 0, 120, 'Initial warehouse stock - Amul Butter', 'a0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days'),
  ('10000001-0000-0000-0000-000000000004', 'STOCK_IN', 84, 'purchase', 0, 84, 'Initial warehouse stock - Tata Tea', 'a0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '7 days'),
  ('10000001-0000-0000-0000-000000000005', 'STOCK_IN', 216, 'purchase', 0, 216, 'Initial warehouse stock - Lux Soap', 'a0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '4 days'),
  ('10000001-0000-0000-0000-000000000006', 'STOCK_IN', 54, 'purchase', 0, 54, 'Initial warehouse stock - Coca-Cola', 'a0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day'),
  ('10000001-0000-0000-0000-000000000007', 'STOCK_IN', 360, 'purchase', 0, 360, 'Initial warehouse stock - Tata Salt', 'a0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '6 days'),
  ('10000001-0000-0000-0000-000000000008', 'STOCK_IN', 72, 'purchase', 0, 72, 'Initial warehouse stock - Surf Excel', 'a0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '10 days'),
  ('10000001-0000-0000-0000-000000000009', 'STOCK_IN', 168, 'purchase', 0, 168, 'Initial warehouse stock - Balaji Mixture', 'a0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days'),
  ('10000001-0000-0000-0000-000000000010', 'STOCK_IN', 288, 'purchase', 0, 288, 'Initial warehouse stock - Patanjali Dant Kanti', 'a0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '8 days')
ON CONFLICT DO NOTHING;

-- 10. SAMPLE ORDERS (3 orders from different shops)
INSERT INTO orders (id, order_number, shop_id, subtotal, discount, tax, delivery_charge, total, payment_status, order_status, placed_by, confirmed_by, confirmed_at, notes, created_at) VALUES
  ('30000001-0000-0000-0000-000000000001', 'ORD-2026-00001', 'c0000001-0000-0000-0000-000000000001',
   5080.00, 0.00, 609.60, 0.00, 5689.60, 'paid', 'delivered',
   'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
   NOW() - INTERVAL '5 days', 'Monthly bulk restock order', NOW() - INTERVAL '6 days'),

  ('30000001-0000-0000-0000-000000000002', 'ORD-2026-00002', 'c0000001-0000-0000-0000-000000000002',
   2480.00, 0.00, 297.60, 0.00, 2777.60, 'unpaid', 'dispatched',
   'b0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001',
   NOW() - INTERVAL '2 days', 'Urgent beverage restock', NOW() - INTERVAL '3 days'),

  ('30000001-0000-0000-0000-000000000003', 'ORD-2026-00003', 'c0000001-0000-0000-0000-000000000003',
   1590.00, 0.00, 190.80, 0.00, 1780.80, 'unpaid', 'pending',
   'b0000001-0000-0000-0000-000000000003', NULL, NULL,
   'Weekly standard order', NOW() - INTERVAL '1 day')
ON CONFLICT (order_number) DO NOTHING;

-- 11. ORDER ITEMS (with product snapshots)
INSERT INTO order_items (order_id, product_id, sku, product_name_snapshot, hsn_code_snapshot, quantity, unit_price, discount, tax_rate_snapshot, tax, total) VALUES
  -- Order 1 items (Shree Krishna Traders)
  ('30000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000001', 'BLJ-MSTK-150', 'Balaji Masala Wafers 150g', '19052090', 48, 26.50, 0.00, 12.00, 152.64, 1424.64),
  ('30000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000004', 'TATA-TEA-1KG', 'Tata Tea Premium 1Kg', '09024010', 6, 465.00, 0.00, 5.00, 139.50, 2929.50),
  ('30000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000007', 'TATA-SALT-1KG', 'Tata Salt 1Kg Iodized', '25010020', 24, 24.00, 0.00, 5.00, 28.80, 604.80),

  -- Order 2 items (Jai Matadi Enterprise)
  ('30000001-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000006', 'COCA-2L', 'Coca-Cola 2 Litre PET Bottle', '22021010', 18, 82.00, 0.00, 28.00, 413.28, 1889.28),
  ('30000001-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000002', 'PRL-G20-800', 'Parle-G Gold Biscuit 800g', '19053100', 12, 82.00, 0.00, 18.00, 177.12, 1161.12),

  -- Order 3 items (Krishna General Store)
  ('30000001-0000-0000-0000-000000000003', '10000001-0000-0000-0000-000000000005', 'HUL-LUX-3PK', 'Lux Soft Touch Soap 3-Pack', '34011130', 6, 155.00, 0.00, 18.00, 167.40, 1097.40),
  ('30000001-0000-0000-0000-000000000003', '10000001-0000-0000-0000-000000000010', 'PTJ-DANT-200', 'Patanjali Dant Kanti 200g', '33061020', 12, 86.00, 0.00, 18.00, 185.76, 1217.76)
ON CONFLICT DO NOTHING;

-- 12. ORDER STATUS HISTORY
INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, created_at) VALUES
  -- Order 1 lifecycle
  ('30000001-0000-0000-0000-000000000001', NULL, 'pending', 'b0000001-0000-0000-0000-000000000001', 'Order placed by shop', NOW() - INTERVAL '6 days'),
  ('30000001-0000-0000-0000-000000000001', 'pending', 'confirmed', 'a0000001-0000-0000-0000-000000000001', 'Confirmed by warehouse admin', NOW() - INTERVAL '5 days'),
  ('30000001-0000-0000-0000-000000000001', 'confirmed', 'processing', 'a0000001-0000-0000-0000-000000000002', 'Warehouse pick & pack started', NOW() - INTERVAL '5 days'),
  ('30000001-0000-0000-0000-000000000001', 'processing', 'dispatched', 'a0000001-0000-0000-0000-000000000002', 'Vehicle dispatched - Route A-12', NOW() - INTERVAL '4 days'),
  ('30000001-0000-0000-0000-000000000001', 'dispatched', 'delivered', 'a0000001-0000-0000-0000-000000000002', 'Delivered & signed by Ramesh Patel', NOW() - INTERVAL '4 days'),

  -- Order 2 lifecycle
  ('30000001-0000-0000-0000-000000000002', NULL, 'pending', 'b0000001-0000-0000-0000-000000000002', 'Order placed', NOW() - INTERVAL '3 days'),
  ('30000001-0000-0000-0000-000000000002', 'pending', 'confirmed', 'a0000001-0000-0000-0000-000000000001', 'Confirmed', NOW() - INTERVAL '2 days'),
  ('30000001-0000-0000-0000-000000000002', 'confirmed', 'dispatched', 'a0000001-0000-0000-0000-000000000002', 'Dispatched on vehicle GJ-03-XX-1234', NOW() - INTERVAL '1 day'),

  -- Order 3
  ('30000001-0000-0000-0000-000000000003', NULL, 'pending', 'b0000001-0000-0000-0000-000000000003', 'New weekly order placed', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- 13. INVOICES
INSERT INTO invoices (id, invoice_number, order_id, shop_id, subtotal, discount, tax, total, invoice_date, due_date, status) VALUES
  ('40000001-0000-0000-0000-000000000001', 'INV-2026-00001', '30000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001',
   5080.00, 0.00, 609.60, 5689.60, CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE + INTERVAL '11 days', 'paid'),
  ('40000001-0000-0000-0000-000000000002', 'INV-2026-00002', '30000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002',
   2480.00, 0.00, 297.60, 2777.60, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '14 days', 'issued')
ON CONFLICT (invoice_number) DO NOTHING;

-- 14. PAYMENTS
INSERT INTO payments (id, shop_id, order_id, invoice_id, amount, method, transaction_reference, status, payment_date, received_by, notes) VALUES
  ('50000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', '30000001-0000-0000-0000-000000000001', '40000001-0000-0000-0000-000000000001',
   5689.60, 'neft', 'NEFT-UTR-20261002-SKT001', 'paid', CURRENT_DATE - INTERVAL '3 days',
   'a0000001-0000-0000-0000-000000000003', 'Full payment received via NEFT from SBI Ahmedabad')
ON CONFLICT DO NOTHING;

-- 15. SHOP LEDGER ENTRIES
INSERT INTO shop_ledger (shop_id, transaction_type, reference_type, reference_id, debit, credit, balance, note, created_by) VALUES
  -- Shop 1 ledger
  ('c0000001-0000-0000-0000-000000000001', 'INVOICE', 'invoice', '40000001-0000-0000-0000-000000000001', 5689.60, 0.00, 5689.60, 'Invoice INV-2026-00001 raised', 'a0000001-0000-0000-0000-000000000001'),
  ('c0000001-0000-0000-0000-000000000001', 'PAYMENT', 'payment', '50000001-0000-0000-0000-000000000001', 0.00, 5689.60, 0.00, 'Payment via NEFT received', 'a0000001-0000-0000-0000-000000000003'),
  -- Shop 2 ledger
  ('c0000001-0000-0000-0000-000000000002', 'INVOICE', 'invoice', '40000001-0000-0000-0000-000000000002', 2777.60, 0.00, 2777.60, 'Invoice INV-2026-00002 raised - pending payment', 'a0000001-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- 16. ROLES
INSERT INTO roles (id, name, description, is_system) VALUES
  ('60000001-0000-0000-0000-000000000001', 'Super Admin', 'Full platform access and control', true),
  ('60000001-0000-0000-0000-000000000002', 'Warehouse Manager', 'Inventory, orders, and warehouse operations', true),
  ('60000001-0000-0000-0000-000000000003', 'Billing Clerk', 'Invoice creation and payment recording', true),
  ('60000001-0000-0000-0000-000000000004', 'Dispatcher', 'Order dispatch and delivery coordination', true),
  ('60000001-0000-0000-0000-000000000005', 'Viewer', 'Read-only dashboard access', false)
ON CONFLICT (name) DO NOTHING;

-- 17. PERMISSIONS
INSERT INTO permissions (module, action, description) VALUES
  ('dashboard', 'view', 'View admin dashboard'),
  ('products', 'view', 'View wholesale product catalog'),
  ('products', 'create', 'Add new wholesale products'),
  ('products', 'update', 'Edit product details and pricing'),
  ('products', 'delete', 'Archive or remove products'),
  ('inventory', 'view', 'View central warehouse stock levels'),
  ('inventory', 'update', 'Record stock inward, adjustments'),
  ('orders', 'view', 'View all wholesale orders'),
  ('orders', 'update', 'Confirm, process, and dispatch orders'),
  ('orders', 'cancel', 'Cancel or reject orders'),
  ('billing', 'view', 'View invoices and payment receipts'),
  ('billing', 'create', 'Generate tax invoices'),
  ('shops', 'view', 'View registered shop accounts'),
  ('shops', 'approve', 'Approve or reject new shop applications'),
  ('shops', 'update', 'Edit shop details and credit limits'),
  ('payments', 'view', 'View payment collections'),
  ('payments', 'create', 'Record incoming payments'),
  ('reports', 'view', 'Access analytics and reports'),
  ('settings', 'view', 'View platform settings'),
  ('settings', 'update', 'Modify platform configuration'),
  ('staff', 'view', 'View staff directory'),
  ('staff', 'manage', 'Add, edit, or remove staff roles')
ON CONFLICT (module, action) DO NOTHING;

-- 18. STAFF
INSERT INTO staff (user_id, role_id, department, designation) VALUES
  ('a0000001-0000-0000-0000-000000000001', '60000001-0000-0000-0000-000000000001', 'Administration', 'Platform Owner'),
  ('a0000001-0000-0000-0000-000000000002', '60000001-0000-0000-0000-000000000002', 'Warehouse Operations', 'Warehouse Head'),
  ('a0000001-0000-0000-0000-000000000003', '60000001-0000-0000-0000-000000000003', 'Finance & Billing', 'Senior Billing Executive')
ON CONFLICT (user_id) DO NOTHING;

-- 19. SAMPLE NOTIFICATIONS
INSERT INTO notifications (recipient_user_id, title, message, type, priority, is_read) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'Order Delivered', 'Your order ORD-2026-00001 has been delivered to your shop.', 'order', 'normal', true),
  ('b0000001-0000-0000-0000-000000000002', 'Order Dispatched', 'Your order ORD-2026-00002 is out for delivery via vehicle GJ-03-XX-1234.', 'order', 'high', false),
  ('b0000001-0000-0000-0000-000000000003', 'Order Received', 'Your order ORD-2026-00003 has been received and is under review.', 'order', 'normal', false),
  ('a0000001-0000-0000-0000-000000000001', 'New Retailer Application', 'Ganesh Distributor (Vadodara) has applied for retailer account.', 'system', 'high', false),
  ('a0000001-0000-0000-0000-000000000001', 'Low Stock Alert', 'Coca-Cola 2L stock is below minimum threshold (54 units < 60 min).', 'stock', 'urgent', false)
ON CONFLICT DO NOTHING;

-- 20. SAMPLE OFFERS
INSERT INTO offers (id, title, description, discount_type, discount_value, minimum_order_value, start_at, end_at, status) VALUES
  ('70000001-0000-0000-0000-000000000001', 'Navratri Wholesale Festival', 'Flat 10% off on all snacks and namkeen category for wholesale orders above ₹5000', 'percentage', 10.00, 5000.00, NOW(), NOW() + INTERVAL '15 days', 'active'),
  ('70000001-0000-0000-0000-000000000002', 'Amul Butter Bulk Deal', 'Buy 30+ units of Amul Butter and get ₹500 flat discount', 'flat', 500.00, 7500.00, NOW(), NOW() + INTERVAL '30 days', 'active')
ON CONFLICT DO NOTHING;

-- 21. CARTS (empty carts for active shops)
INSERT INTO carts (shop_id) VALUES
  ('c0000001-0000-0000-0000-000000000001'),
  ('c0000001-0000-0000-0000-000000000002'),
  ('c0000001-0000-0000-0000-000000000003'),
  ('c0000001-0000-0000-0000-000000000004')
ON CONFLICT (shop_id) DO NOTHING;

-- Record seed execution
INSERT INTO _migrations (name) VALUES ('002_seed_data')
ON CONFLICT (name) DO NOTHING;
