-- ============================================
-- TableFlow — Utility Functions
-- ============================================

-- ============================================
-- Generate sequential order number per restaurant
-- Format: #001, #002, etc. (resets daily optional)
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number(p_restaurant_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(REPLACE(order_number, '#', '') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM orders
  WHERE restaurant_id = p_restaurant_id
    AND DATE(created_at) = CURRENT_DATE;

  RETURN '#' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Auto-set order number on insert
-- ============================================
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number(NEW.restaurant_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_order_number();

-- ============================================
-- Generate slug from restaurant name
-- ============================================
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(name),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Calculate order total from items
-- ============================================
CREATE OR REPLACE FUNCTION calculate_order_total(p_order_id UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(item_price * quantity), 0)
  FROM order_items
  WHERE order_id = p_order_id;
$$ LANGUAGE sql STABLE;
