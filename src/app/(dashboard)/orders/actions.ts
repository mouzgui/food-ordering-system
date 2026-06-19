"use server";

import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/types/database";

export async function fetchUserRestaurantId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: member } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single() as any;

  if (!member) return { error: "Restaurant not found" };
  return { restaurantId: member.restaurant_id };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = await createClient();
  const query = supabase.from("orders") as any;
  const { error } = await query.update({ status }).eq("id", orderId);
  if (error) return { error: error.message };
  return { success: true };
}
