"use server";

import { createClient } from "@/lib/supabase/server";



export async function fetchOverviewStats() {
  const supabase = await createClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: member } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return { error: "No restaurant found" };
  const restaurantId = member.restaurant_id;

  // Set time boundaries for today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Fetch Orders for Today
  const { data: todayOrders } = await supabase
    .from("orders")
    .select("*, tables(label), order_items(quantity, item_name, item_price)")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString())
    .order("created_at", { ascending: false });

  const orders = todayOrders || [];

  // Calculate metrics
  const activeOrdersCount = orders.filter((o: any) => o.status !== "delivered" && o.status !== "cancelled").length;
  const todayTotalOrders = orders.length;
  const todayRevenue = orders
    .filter((o: any) => o.status !== "cancelled")
    .reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);

  // 2. Fetch all menu items for "unavailable" count
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, is_available")
    .eq("restaurant_id", restaurantId);
  
  const totalItems = menuItems?.length || 0;
  const unavailableItems = menuItems?.filter((i: any) => !i.is_available).length || 0;

  // 3. Calculate Popular Items from today's orders
  const itemMap: Record<string, { orders: number, revenue: number }> = {};
  orders.forEach((o: any) => {
    if (o.status === "cancelled") return;
    (o.order_items || []).forEach((item: any) => {
      if (!itemMap[item.item_name]) itemMap[item.item_name] = { orders: 0, revenue: 0 };
      itemMap[item.item_name].orders += item.quantity;
      itemMap[item.item_name].revenue += item.quantity * item.item_price;
    });
  });

  const popularItems = Object.entries(itemMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5);

  // Format recent orders for UI
  const recentOrdersList = orders.slice(0, 6).map((o: any) => ({
    id: o.id,
    orderNumber: o.order_number,
    table: o.tables?.label || "Unknown",
    status: o.status,
    total: o.total_amount,
    time: o.created_at,
    items: o.order_items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0
  }));

  return {
    metrics: {
      activeOrders: activeOrdersCount,
      todayOrders: todayTotalOrders,
      todayRevenue: todayRevenue,
      totalItems,
      unavailableItems
    },
    popularItems,
    recentOrdersList
  };
}
