"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/permissions";

export async function fetchTables() {
  const supabase = (await createClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: member } = await supabase
    .from("restaurant_members")
    .select("restaurant_id, restaurants(slug)")
    .eq("user_id", user.id)
    .single();

  if (!member) return { error: "No restaurant found" };
  
  // @ts-ignore - The types from supabase might need strict casting for joined tables
  const slug = member.restaurants?.slug;

  const { data: tables, error } = await supabase
    .from("tables")
    .select("*")
    .eq("restaurant_id", member.restaurant_id)
    .order("number");

  if (error) return { error: error.message };

  return { tables, slug, restaurantId: member.restaurant_id };
}

export async function createTable(restaurantId: string, label: string, number: number) {
  const membership = await requireRole(["owner", "manager"]);
  if (membership.restaurantId !== restaurantId) return { error: "Unauthorized" };

  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("tables")
    .insert([{ restaurant_id: restaurantId, label, number }])
    .select("*")
    .single();
    
  if (error) return { error: error.message };
  return { table: data };
}

export async function updateTableActive(id: string, is_active: boolean) {
  await requireRole(["owner", "manager"]);
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("tables").update({ is_active }).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteTableDb(id: string) {
  await requireRole(["owner", "manager"]);
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("tables").delete().eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}
