"use server";

import { createClient } from "@supabase/supabase-js";
import {
  calculateDueAt,
  normalizeRestaurantSettings,
} from "@/lib/restaurant-settings";
import type { OrderStatus } from "@/types/database";

// Use the service role key for anonymous customer operations since they do not have auth sessions
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function fetchCustomerMenu(slug: string, tableId: string) {
  const supabase = getAdminClient();

  // 1. Get restaurant ID from slug
  const { data: restaurant } = (await supabase
    .from("restaurants")
    .select("id, name, settings")
    .eq("slug", slug)
    .single()) as any;

  if (!restaurant) return { error: "Restaurant not found" };

  // 2. Validate table ID
  const { data: table } = (await supabase
    .from("tables")
    .select("id, label, is_active")
    .eq("id", tableId)
    .eq("restaurant_id", restaurant.id)
    .single()) as any;

  if (!table || !table.is_active) return { error: "Invalid or inactive table" };

  // 3. Get Categories
  const { data: categories } = (await supabase
    .from("categories")
    .select("id, name")
    .eq("restaurant_id", restaurant.id)
    .order("sort_order")) as any;

  // 4. Get Menu Items
  const { data: items } = (await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("sort_order")) as any;

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      settings: normalizeRestaurantSettings(restaurant.settings),
    },
    table: { id: table.id, label: table.label },
    categories: categories || [],
    items: items || [],
  };
}

export async function submitOrder(
  restaurantId: string,
  tableId: string,
  customerName: string,
  cartItems: {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
  }[],
  totalAmount: number,
) {
  const supabase = getAdminClient();
  const placedAt = new Date();

  const { data: restaurant } = await (supabase.from("restaurants") as any)
    .select("id, settings")
    .eq("id", restaurantId)
    .single();

  const settings = normalizeRestaurantSettings(restaurant?.settings);
  const initialStatus: OrderStatus = settings.orderWorkflow.autoAccept
    ? "accepted"
    : "pending";
  const dueAt = calculateDueAt(
    placedAt,
    settings.orderWorkflow.prepTargetMinutes,
  );

  // Generate an order number
  const orderNumber = Math.floor(1000 + Math.random() * 9000).toString();

  // 1. Insert Order
  const ordersQuery = supabase.from("orders") as any;
  const { data: order, error: orderError } = await ordersQuery
    .insert([
      {
        restaurant_id: restaurantId,
        table_id: tableId,
        order_number: orderNumber,
        status: initialStatus,
        total_amount: totalAmount,
        customer_info: { name: customerName },
        due_at: dueAt,
      },
    ])
    .select("id")
    .single();

  if (orderError || !order)
    return { error: orderError?.message || "Failed to create order" };

  // 2. Insert Order Items
  const itemsQuery = supabase.from("order_items") as any;
  const { error: itemsError } = await itemsQuery.insert(
    cartItems.map((ci) => ({
      order_id: order.id,
      menu_item_id: ci.itemId,
      item_name: ci.name,
      item_price: ci.price,
      quantity: ci.quantity,
    })),
  );

  if (itemsError) return { error: itemsError.message };

  const eventsQuery = supabase.from("order_events") as any;
  const { error: eventError } = await eventsQuery.insert([
    {
      restaurant_id: restaurantId,
      order_id: order.id,
      event_type: "order_placed",
      to_status: initialStatus,
      metadata: {
        source: "customer_qr",
        customer_name: customerName || "Guest",
        table_id: tableId,
        item_count: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        total_amount: totalAmount,
      },
      created_at: placedAt.toISOString(),
    },
  ]);

  if (eventError) return { error: eventError.message };

  return {
    success: true,
    orderNumber,
    orderId: order.id,
    initialStatus,
    dueAt,
  };
}
