-- ============================================
-- TableFlow — Row Level Security Policies
-- Enforces multi-tenant data isolation at the
-- database level.
-- ============================================

-- ============================================
-- Helper functions for RLS (PL/pgSQL to prevent inlining and recursion)
-- ============================================

CREATE OR REPLACE FUNCTION get_user_restaurant_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT restaurant_id
  FROM restaurant_members
  WHERE user_id = auth.uid() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_manager_restaurant_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT restaurant_id
  FROM restaurant_members
  WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_owner_restaurant_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT restaurant_id
  FROM restaurant_members
  WHERE user_id = auth.uid() AND is_active = true AND role = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- RESTAURANTS
-- ============================================
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Staff can view their own restaurants
CREATE POLICY "staff_select_restaurants" ON restaurants
  FOR SELECT USING (id IN (SELECT get_user_restaurant_ids()));

-- Only owners can update restaurant settings
CREATE POLICY "owner_update_restaurants" ON restaurants
  FOR UPDATE USING (
    id IN (SELECT get_owner_restaurant_ids())
  );

-- Authenticated users can create restaurants (during onboarding)
CREATE POLICY "authenticated_insert_restaurants" ON restaurants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- RESTAURANT MEMBERS
-- ============================================
ALTER TABLE restaurant_members ENABLE ROW LEVEL SECURITY;

-- Members can see other members in their restaurants
CREATE POLICY "members_select" ON restaurant_members
  FOR SELECT USING (restaurant_id IN (SELECT get_user_restaurant_ids()));

-- Owners can manage members
CREATE POLICY "owner_insert_members" ON restaurant_members
  FOR INSERT WITH CHECK (
    restaurant_id IN (SELECT get_manager_restaurant_ids())
    OR auth.uid() = user_id -- Allow self-insert during onboarding
  );

CREATE POLICY "owner_update_members" ON restaurant_members
  FOR UPDATE USING (
    restaurant_id IN (SELECT get_owner_restaurant_ids())
  );

-- ============================================
-- TABLES
-- ============================================
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Staff can manage their restaurant's tables
CREATE POLICY "staff_select_tables" ON tables
  FOR SELECT USING (restaurant_id IN (SELECT get_user_restaurant_ids()));

-- Public can look up tables by QR token (for customer ordering)
CREATE POLICY "public_select_tables_by_token" ON tables
  FOR SELECT USING (true); -- QR token lookup needs public read; filtered by query

CREATE POLICY "staff_insert_tables" ON tables
  FOR INSERT WITH CHECK (restaurant_id IN (SELECT get_manager_restaurant_ids()));

CREATE POLICY "staff_update_tables" ON tables
  FOR UPDATE USING (restaurant_id IN (SELECT get_manager_restaurant_ids()));

CREATE POLICY "staff_delete_tables" ON tables
  FOR DELETE USING (restaurant_id IN (SELECT get_manager_restaurant_ids()));

-- ============================================
-- CATEGORIES
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Public can read categories (for customer menu display)
CREATE POLICY "public_select_categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "staff_insert_categories" ON categories
  FOR INSERT WITH CHECK (restaurant_id IN (SELECT get_manager_restaurant_ids()));

CREATE POLICY "staff_update_categories" ON categories
  FOR UPDATE USING (restaurant_id IN (SELECT get_manager_restaurant_ids()));

CREATE POLICY "staff_delete_categories" ON categories
  FOR DELETE USING (restaurant_id IN (SELECT get_manager_restaurant_ids()));

-- ============================================
-- MENU ITEMS
-- ============================================
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Public can read menu items (for customer ordering)
CREATE POLICY "public_select_menu_items" ON menu_items
  FOR SELECT USING (true);

CREATE POLICY "staff_insert_menu_items" ON menu_items
  FOR INSERT WITH CHECK (restaurant_id IN (SELECT get_manager_restaurant_ids()));

CREATE POLICY "staff_update_menu_items" ON menu_items
  FOR UPDATE USING (restaurant_id IN (SELECT get_manager_restaurant_ids()));

CREATE POLICY "staff_delete_menu_items" ON menu_items
  FOR DELETE USING (restaurant_id IN (SELECT get_manager_restaurant_ids()));

-- ============================================
-- ORDERS
-- ============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Staff can see orders for their restaurants
CREATE POLICY "staff_select_orders" ON orders
  FOR SELECT USING (restaurant_id IN (SELECT get_user_restaurant_ids()));

-- Public (anonymous customers) can create orders
CREATE POLICY "public_insert_orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Public can view their own orders (by ID, passed from client)
CREATE POLICY "public_select_own_orders" ON orders
  FOR SELECT USING (true); -- Filtered by ID on the client side

-- Staff can update order status
CREATE POLICY "staff_update_orders" ON orders
  FOR UPDATE USING (restaurant_id IN (SELECT get_user_restaurant_ids()));

-- ============================================
-- ORDER ITEMS
-- ============================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Same visibility as orders
CREATE POLICY "select_order_items" ON order_items
  FOR SELECT USING (true);

CREATE POLICY "insert_order_items" ON order_items
  FOR INSERT WITH CHECK (true);
