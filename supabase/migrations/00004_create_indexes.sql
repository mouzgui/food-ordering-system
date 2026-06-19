-- ============================================
-- TableFlow — Performance Indexes
-- Optimized for multi-tenant queries with
-- restaurant_id as the primary filter.
-- ============================================

-- Restaurant lookups
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_active ON restaurants(is_active) WHERE is_active = true;

-- Member lookups (critical for RLS helper function)
CREATE INDEX idx_restaurant_members_user ON restaurant_members(user_id) WHERE is_active = true;
CREATE INDEX idx_restaurant_members_restaurant ON restaurant_members(restaurant_id);

-- Table lookups
CREATE INDEX idx_tables_restaurant ON tables(restaurant_id);
CREATE INDEX idx_tables_qr_token ON tables(qr_code_token);

-- Category lookups
CREATE INDEX idx_categories_restaurant ON categories(restaurant_id);
CREATE INDEX idx_categories_sort ON categories(restaurant_id, sort_order);

-- Menu item lookups
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(restaurant_id, is_available) WHERE is_available = true;

-- Order lookups (most performance-critical)
CREATE INDEX idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX idx_orders_restaurant_date ON orders(restaurant_id, created_at DESC);
CREATE INDEX idx_orders_table ON orders(table_id);
CREATE INDEX idx_orders_active ON orders(restaurant_id, status)
  WHERE status NOT IN ('delivered', 'cancelled');

-- Order items
CREATE INDEX idx_order_items_order ON order_items(order_id);
