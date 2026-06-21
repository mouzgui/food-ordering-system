-- ============================================
-- TableFlow — Staff Workflow and Analytics
-- Adds kitchen and waiter workflow tracking,
-- order events, and richer operational metrics.
-- ============================================

-- Add new staff role for kitchen-only operators
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'kitchen_staff';

-- Existing indexes that depend on orders.status must be dropped before
-- rebuilding the enum type.
DROP INDEX IF EXISTS idx_orders_restaurant_status;
DROP INDEX IF EXISTS idx_orders_active;

-- Rebuild the order status enum safely so confirmed can be migrated
-- to accepted in the same migration without transaction issues.
ALTER TYPE order_status RENAME TO order_status_old;

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'accepted',
  'preparing',
  'ready',
  'served',
  'delivered',
  'cancelled'
);

ALTER TABLE orders
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE order_status
  USING (
    CASE
      WHEN status::text = 'confirmed' THEN 'accepted'
      ELSE status::text
    END
  )::order_status,
  ALTER COLUMN status SET DEFAULT 'pending';

DROP TYPE order_status_old;

-- Extend orders with workflow timestamps and responsible staff members
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS accepted_by_member_id UUID REFERENCES restaurant_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preparing_started_by_member_id UUID REFERENCES restaurant_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preparing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_by_member_id UUID REFERENCES restaurant_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS served_by_member_id UUID REFERENCES restaurant_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS served_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_by_member_id UUID REFERENCES restaurant_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_assignee_member_id UUID REFERENCES restaurant_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

-- Seed workflow timestamps for historical records where possible
UPDATE orders
SET
  accepted_at = COALESCE(accepted_at, created_at),
  preparing_started_at = COALESCE(preparing_started_at, updated_at)
WHERE status IN ('accepted', 'preparing', 'ready', 'served', 'delivered')
  AND accepted_at IS NULL;

UPDATE orders
SET ready_at = COALESCE(ready_at, updated_at)
WHERE status IN ('ready', 'served', 'delivered')
  AND ready_at IS NULL;

UPDATE orders
SET
  served_at = COALESCE(served_at, updated_at),
  delivered_at = COALESCE(delivered_at, updated_at)
WHERE status = 'delivered';

-- Event log for analytics and audit trail
CREATE TABLE IF NOT EXISTS order_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  member_id UUID REFERENCES restaurant_members(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role staff_role,
  event_type TEXT NOT NULL,
  from_status order_status,
  to_status order_status,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_order_events" ON order_events
  FOR SELECT USING (restaurant_id IN (SELECT get_user_restaurant_ids()));

CREATE POLICY "staff_insert_order_events" ON order_events
  FOR INSERT WITH CHECK (restaurant_id IN (SELECT get_user_restaurant_ids()));

-- Replay a historical placed event for existing orders if needed.
INSERT INTO order_events (
  restaurant_id,
  order_id,
  event_type,
  to_status,
  metadata,
  created_at
)
SELECT
  restaurant_id,
  id,
  'order_placed',
  status,
  jsonb_build_object('source', 'migration_00008'),
  created_at
FROM orders
WHERE NOT EXISTS (
  SELECT 1
  FROM order_events
  WHERE order_events.order_id = orders.id
);

-- Make order_events available to realtime consumers if needed later.
ALTER PUBLICATION supabase_realtime ADD TABLE order_events;

-- Performance indexes for workflow queues and analytics
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status_created
  ON orders(restaurant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_ready_at
  ON orders(restaurant_id, ready_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_due_at
  ON orders(restaurant_id, due_at DESC)
  WHERE due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_current_assignee
  ON orders(current_assignee_member_id)
  WHERE current_assignee_member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_events_restaurant_created
  ON order_events(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_events_order_created
  ON order_events(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_events_member_created
  ON order_events(member_id, created_at DESC)
  WHERE member_id IS NOT NULL;
