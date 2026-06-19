"use server";

import { createClient } from "@/lib/supabase/server";

export async function fetchMenuData() {
  const supabase = await createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: member } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single() as any;

  if (!member) return { error: "Restaurant not found" };

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", member.restaurant_id)
    .order("sort_order") as any;

  const { data: items } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", member.restaurant_id)
    .order("sort_order") as any;

  return {
    restaurantId: member.restaurant_id,
    categories: categories || [],
    items: items || [],
  };
}

export async function createCategory(restaurantId: string, name: string, description: string, sortOrder: number) {
  const supabase = await createClient() as any;
  const { data, error } = await supabase
    .from("categories")
    .insert([{ restaurant_id: restaurantId, name, description, sort_order: sortOrder }] as any)
    .select()
    .single();

  if (error) return { error: error.message };
  return { category: data };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient() as any;
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function createMenuItem(
  categoryId: string,
  restaurantId: string,
  name: string,
  description: string,
  price: number
) {
  const supabase = await createClient() as any;
  const { data, error } = await supabase
    .from("menu_items")
    .insert([
      { category_id: categoryId, restaurant_id: restaurantId, name, description, price, is_available: true }
    ] as any)
    .select()
    .single();

  if (error) return { error: error.message };
  return { item: data };
}

export async function deleteMenuItem(id: string) {
  const supabase = await createClient() as any;
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleItemAvailability(id: string, isAvailable: boolean) {
  const supabase = await createClient() as any;
  const { error } = await supabase.from("menu_items").update({ is_available: isAvailable } as any).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}
