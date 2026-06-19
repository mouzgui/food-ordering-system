-- Add public select policy for restaurants so customers can look up restaurants by slug
CREATE POLICY "public_select_restaurants" ON restaurants
  FOR SELECT USING (true);
