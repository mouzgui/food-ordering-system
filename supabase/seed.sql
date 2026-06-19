-- ============================================
-- TableFlow — Seed Data for Development
-- Creates a demo restaurant with sample menu
-- ============================================

-- NOTE: Run this AFTER creating a Supabase user.
-- Replace 'YOUR_USER_ID' with the actual auth.users UUID.

-- ============================================
-- Demo Restaurant
-- ============================================
INSERT INTO restaurants (id, name, slug, description, currency, timezone, address, settings)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'La Belle Cuisine',
  'la-belle-cuisine',
  'A charming French-inspired café serving artisanal dishes and specialty coffee.',
  'USD',
  'America/New_York',
  '123 Gourmet Street, Food City',
  '{"orderSettings": {"autoConfirm": false, "requireCustomerName": false}}'
);

-- ============================================
-- Demo Tables
-- ============================================
INSERT INTO tables (restaurant_id, label, number, qr_code_token) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Table 1', 1, 'demo-table-001'),
  ('11111111-1111-1111-1111-111111111111', 'Table 2', 2, 'demo-table-002'),
  ('11111111-1111-1111-1111-111111111111', 'Table 3', 3, 'demo-table-003'),
  ('11111111-1111-1111-1111-111111111111', 'Terrace 1', 4, 'demo-table-004'),
  ('11111111-1111-1111-1111-111111111111', 'Terrace 2', 5, 'demo-table-005'),
  ('11111111-1111-1111-1111-111111111111', 'VIP Room', 6, 'demo-table-006');

-- ============================================
-- Demo Categories
-- ============================================
INSERT INTO categories (id, restaurant_id, name, description, sort_order) VALUES
  ('aaaa1111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Starters', 'Light bites to begin your meal', 1),
  ('aaaa1111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Main Courses', 'Our signature dishes', 2),
  ('aaaa1111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Desserts', 'Sweet endings', 3),
  ('aaaa1111-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Beverages', 'Drinks and refreshments', 4);

-- ============================================
-- Demo Menu Items
-- ============================================
INSERT INTO menu_items (restaurant_id, category_id, name, description, price, is_available, sort_order) VALUES
  -- Starters
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000001', 'Bruschetta', 'Toasted bread with fresh tomatoes, basil, and balsamic glaze', 8.50, true, 1),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000001', 'French Onion Soup', 'Classic soup topped with melted Gruyère cheese', 9.00, true, 2),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000001', 'Caesar Salad', 'Crisp romaine lettuce with parmesan, croutons, and house dressing', 10.00, true, 3),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000001', 'Garlic Shrimp', 'Sautéed shrimp in garlic butter with herbs', 12.50, true, 4),

  -- Main Courses
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000002', 'Grilled Salmon', 'Atlantic salmon with lemon dill sauce and seasonal vegetables', 22.00, true, 1),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000002', 'Beef Tenderloin', '8oz tenderloin with red wine reduction and truffle mashed potatoes', 28.00, true, 2),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000002', 'Chicken Provençal', 'Herb-roasted chicken with ratatouille and roasted potatoes', 18.00, true, 3),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000002', 'Mushroom Risotto', 'Creamy arborio rice with wild mushrooms and parmesan', 16.00, true, 4),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000002', 'Fish & Chips', 'Beer-battered cod with hand-cut fries and tartar sauce', 15.00, false, 5),

  -- Desserts
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000003', 'Crème Brûlée', 'Classic vanilla custard with caramelized sugar top', 9.00, true, 1),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000003', 'Chocolate Fondant', 'Warm chocolate cake with a molten center, served with vanilla ice cream', 11.00, true, 2),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000003', 'Tiramisu', 'Italian coffee-flavored layered dessert', 10.00, true, 3),

  -- Beverages
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000004', 'Espresso', 'Single shot of rich Italian espresso', 3.50, true, 1),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000004', 'Cappuccino', 'Espresso with steamed milk foam', 5.00, true, 2),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000004', 'Fresh Orange Juice', 'Freshly squeezed orange juice', 4.50, true, 3),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000004', 'Sparkling Water', 'San Pellegrino 500ml', 3.00, true, 4),
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000004', 'House Lemonade', 'Homemade lemonade with fresh mint', 5.50, true, 5);
