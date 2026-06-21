"use server";

import { requireRole } from "@/lib/auth/permissions";
import { normalizeRestaurantSettings } from "@/lib/restaurant-settings";
import { createClient } from "@/lib/supabase/server";
import type { RestaurantSettings } from "@/types";

export async function fetchSettings() {
  const supabase = await createClient() as any;
  const membership = await requireRole(["owner", "manager"]);

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", membership.restaurantId)
    .single() as any;

  if (!restaurant) return { error: "Restaurant not found" };

  return {
    restaurant: {
      ...restaurant,
      settings: normalizeRestaurantSettings(restaurant.settings),
    },
  };
}

export async function updateSettings(
  id: string,
  data: {
    name: string;
    slug: string;
    description: string;
    address: string;
    currency: string;
    timezone: string;
    settings: RestaurantSettings;
  }
) {
  const supabase = await createClient() as any;
  const membership = await requireRole(["owner", "manager"]);

  if (membership.restaurantId !== id) {
    return { error: "You do not have access to this restaurant" };
  }

  const { error } = await supabase
    .from("restaurants")
    .update({
      name: data.name,
      slug: data.slug,
      description: data.description,
      address: data.address,
      currency: data.currency,
      timezone: data.timezone,
      settings: normalizeRestaurantSettings(data.settings),
    } as Record<string, any>)
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}
