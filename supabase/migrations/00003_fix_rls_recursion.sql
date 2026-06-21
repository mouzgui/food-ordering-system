-- ============================================
-- Fix for infinite recursion in restaurant_members
-- Converting helper functions to plpgsql to prevent
-- SQL inlining, ensuring SECURITY DEFINER works.
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

-- Also update the owner policies to use these functions directly 
-- instead of doing subqueries to prevent triggering RLS locally.

DROP POLICY IF EXISTS "owner_insert_members" ON restaurant_members;
CREATE POLICY "owner_insert_members" ON restaurant_members
  FOR INSERT WITH CHECK (
    restaurant_id IN (SELECT get_manager_restaurant_ids())
    OR auth.uid() = user_id -- Allow self-insert during onboarding
  );

DROP POLICY IF EXISTS "owner_update_members" ON restaurant_members;
CREATE POLICY "owner_update_members" ON restaurant_members
  FOR UPDATE USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM restaurant_members
      WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
    )
  );
