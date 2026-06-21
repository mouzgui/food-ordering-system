-- ============================================
-- Deep Fix for ALL Infinite Recursion Vectors
-- Converts all helper functions to plpgsql and
-- completely removes direct subqueries from policies
-- ============================================

-- 1. Create strict plpgsql functions (prevents SQL inlining)
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

-- 2. Update Restaurants Table Policies
DROP POLICY IF EXISTS "owner_update_restaurants" ON restaurants;
CREATE POLICY "owner_update_restaurants" ON restaurants
  FOR UPDATE USING (
    id IN (SELECT get_owner_restaurant_ids())
  );

-- 3. Update Restaurant Members Table Policies
DROP POLICY IF EXISTS "owner_insert_members" ON restaurant_members;
CREATE POLICY "owner_insert_members" ON restaurant_members
  FOR INSERT WITH CHECK (
    restaurant_id IN (SELECT get_manager_restaurant_ids())
    OR auth.uid() = user_id -- Allow self-insert during onboarding
  );

DROP POLICY IF EXISTS "owner_update_members" ON restaurant_members;
CREATE POLICY "owner_update_members" ON restaurant_members
  FOR UPDATE USING (
    restaurant_id IN (SELECT get_owner_restaurant_ids())
  );

-- Ensure members_select uses the secure function
DROP POLICY IF EXISTS "members_select" ON restaurant_members;
CREATE POLICY "members_select" ON restaurant_members
  FOR SELECT USING (
    restaurant_id IN (SELECT get_user_restaurant_ids())
  );
