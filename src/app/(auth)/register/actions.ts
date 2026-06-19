"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function createRestaurantForUser(
  userId: string,
  restaurantName: string
) {
  const supabase = createAdminClient();

  // Generate a URL-safe slug from the restaurant name
  const slug = restaurantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);

  // Check if slug exists, append random suffix if needed
  const { data: existing } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .single();

  const finalSlug = existing
    ? `${slug}-${Math.random().toString(36).substring(2, 6)}`
    : slug;

  // Create the restaurant
  const { data, error: restaurantError } = await supabase
    .from("restaurants")
    .insert({
      name: restaurantName,
      slug: finalSlug,
      currency: "USD",
      settings: {
        auto_confirm_orders: false,
        require_customer_name: false,
        show_prices: true,
        enable_notifications: true,
      },
    } as any)
    .select("id")
    .single();
  const restaurant = data as any;

  if (restaurantError) {
    return { error: restaurantError.message };
  }

  // Create the owner membership
  const { error: memberError } = await supabase
    .from("restaurant_members")
    .insert({
      user_id: userId,
      restaurant_id: restaurant.id,
      role: "owner",
    } as any);

  if (memberError) {
    return { error: memberError.message };
  }

  return { restaurantId: restaurant.id, slug: finalSlug };
}
