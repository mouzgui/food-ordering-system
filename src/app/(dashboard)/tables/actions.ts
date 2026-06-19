"use server";

import { createClient } from "@/lib/supabase/server";

export async function fetchTables() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: member } = await supabase
    .from("restaurant_members")
    .select("restaurant_id, restaurants(slug)")
    .eq("user_id", user.id)
    .single() as any;

  if (!member) return { error: "No restaurant found" };

  const { data: tables, error } = await supabase
    .from("tables")
    .select("*")
    .eq("restaurant_id", member.restaurant_id)
    .order("number");

  if (error) return { error: error.message };

  return { tables, slug: member.restaurants.slug, restaurantId: member.restaurant_id };
}

export async function createTable(restaurantId: string, label: string, number: number) {
  const supabase = await createClient();
  const query = supabase.from("tables") as any;
  const { data, error } = await query
    .insert([{ restaurant_id: restaurantId, label, number }])
    .select("*")
    .single();
    
  if (error) return { error: error.message };
  const table = data as any;
  return { table };
}

export async function updateTableActive(id: string, is_active: boolean) {
  const supabase = await createClient();
  const query = supabase.from("tables") as any;
  const { error } = await query.update({ is_active }).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteTableDb(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tables").delete().eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}
