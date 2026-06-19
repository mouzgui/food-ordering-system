-- Allow anonymous users to read their own orders (for real-time order tracking on phone)
-- This enables the customer's phone to subscribe to order status updates via Supabase Realtime.
CREATE POLICY "Public read orders for tracking" ON orders FOR SELECT TO anon, authenticated USING (true);
